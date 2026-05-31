package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/teleyab/teleyab/internal/config"
	"github.com/teleyab/teleyab/internal/db"
	"github.com/teleyab/teleyab/internal/email"
	"github.com/teleyab/teleyab/internal/session"
	"github.com/teleyab/teleyab/internal/upstream"
)

type Handlers struct {
	Cfg       *config.Config
	DB        *db.DB
	Sessions  *session.Manager
	Email     *email.Client
	Upstream  *upstream.Client
	UploadDir string

	rl rateLimiter
}

func (h *Handlers) Mount(r chi.Router) {
	h.rl.init()

	// Apply rate-limit middleware to /api/* (but not /healthz).
	r.Get("/healthz", h.health)

	r.Route("/api", func(r chi.Router) {
		r.Use(h.rateLimit)

		r.Post("/auth/register", h.authRegister)
		r.Post("/auth/login", h.authLogin)
		r.Post("/auth/verify-email", h.authVerifyEmail)
		r.Post("/auth/forgot-password", h.authForgotPassword)
		r.Post("/auth/reset-password", h.authResetPassword)
		r.Post("/auth/logout", h.authLogout)
		r.Get("/me", h.me)

		r.Get("/public/pricing", h.publicPricing)

		r.Post("/lookup", h.lookup)
		r.Get("/lookups", h.lookupHistory)

		r.Post("/topup/request", h.topupRequest)
		r.Get("/topup/requests", h.topupMyRequests)
		r.Get("/uploads/receipts/{filename}", h.serveReceiptImage)

		r.Get("/me/referral", h.myReferral)

		// Public API: callers authenticate with Bearer api-key OR session cookie.
		r.Post("/v1/lookup", h.publicAPILookup)

		// User-scoped API key management.
		r.Get("/keys", h.listKeys)
		r.Post("/keys", h.createKey)
		r.Delete("/keys/{id}", h.revokeKey)

		// Bulk-import (CSV-style; rows are queued and worked through synchronously).
		r.Post("/lookup/batch", h.createBatch)
		r.Get("/lookup/batches", h.listBatches)
		r.Get("/lookup/batch/{id}", h.getBatch)

		// Admin
		r.Get("/admin/upstream-balance", h.adminUpstreamBalance)
		r.Get("/admin/stats", h.adminStats)
		r.Get("/admin/settings", h.adminGetSettings)
		r.Patch("/admin/settings", h.adminPatchSettings)
		r.Get("/admin/users", h.adminListUsers)
		r.Get("/admin/users/{id}", h.adminGetUser)
		r.Post("/admin/users/{id}/ban", h.adminBanUser)
		r.Post("/admin/users/{id}/unban", h.adminUnbanUser)
		r.Post("/admin/users/{id}/force-logout", h.adminForceLogout)
		r.Post("/admin/users/{id}/adjust", h.adminAdjustBalance)
		r.Get("/admin/refunds", h.adminListRefunds)
		r.Post("/admin/refunds/{id}/resolve", h.adminResolveRefund)
		r.Post("/admin/refunds/{id}/reject", h.adminRejectRefund)
		r.Get("/admin/flags", h.adminListFlags)
		r.Get("/admin/providers", h.adminListProviders)
		r.Post("/admin/providers", h.adminUpsertProvider)
		r.Post("/admin/providers/{id}/toggle", h.adminToggleProvider)
		r.Delete("/admin/providers/{id}", h.adminDeleteProvider)
		r.Get("/admin/resellers", h.adminListResellers)
		r.Post("/admin/resellers", h.adminCreateReseller)
		r.Get("/admin/payments", h.adminListPayments)
		r.Post("/admin/payments/{id}/approve", h.adminApprovePayment)
		r.Post("/admin/payments/{id}/reject", h.adminRejectPayment)
	})
}

func (h *Handlers) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "time": time.Now().UTC()})
}

// ─────────────────────── rate limiting middleware ──────────────────────────

type rateLimiter struct {
	mu     sync.Mutex
	ipHits map[string][]time.Time
}

func (rl *rateLimiter) init() {
	rl.ipHits = make(map[string][]time.Time)
}

// rateLimit applies a per-IP minute window and (for authenticated requests)
// a per-user-id minute window. Quotas come from settings table.
func (h *Handlers) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		// per-IP minute-window limit
		limit := int(h.DB.GetSettingFloat(r.Context(), "per_ip_minute_quota", 30))
		if ip != "" && h.rl.hitAndCheck("ip:"+ip, limit, time.Minute) {
			writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many requests")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (rl *rateLimiter) hitAndCheck(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-window)
	hits := rl.ipHits[key]
	// keep only recent
	keep := hits[:0]
	for _, t := range hits {
		if t.After(cutoff) {
			keep = append(keep, t)
		}
	}
	keep = append(keep, now)
	rl.ipHits[key] = keep
	return len(keep) > limit
}

// ─────────────────────────────── auth ──────────────────────────────────────

type authRegisterBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	RefCode  string `json:"ref_code,omitempty"`
}

func (h *Handlers) authRegister(w http.ResponseWriter, r *http.Request) {
	var body authRegisterBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	emailAddr := strings.ToLower(strings.TrimSpace(body.Email))
	if !looksLikeEmail(emailAddr) {
		writeError(w, http.StatusBadRequest, "bad_email", "آدرس ایمیل معتبر نیست")
		return
	}
	if len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "bad_password", "رمز عبور باید حداقل ۸ کاراکتر باشد")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "Could not hash password")
		return
	}

	ctx := r.Context()

	// Check if user already exists with a verified password
	var existingID int64
	var existingVerified *time.Time
	var existingHash *string
	checkErr := h.DB.QueryRow(ctx, `
		SELECT id, email_verified_at, password_hash FROM users WHERE email=$1
	`, emailAddr).Scan(&existingID, &existingVerified, &existingHash)

	if checkErr == nil && existingHash != nil && existingVerified != nil {
		writeError(w, http.StatusConflict, "already_registered", "این ایمیل قبلاً ثبت شده. لطفاً وارد شوید.")
		return
	}

	refCode := generateRefCode()
	if checkErr == pgx.ErrNoRows {
		// New user — create
		if err := h.DB.QueryRow(ctx, `
			INSERT INTO users (email, password_hash, is_active, referral_code)
			VALUES ($1, $2, TRUE, $3)
			RETURNING id
		`, emailAddr, string(hash), refCode).Scan(&existingID); err != nil {
			log.Printf("user insert: %v", err)
			writeError(w, http.StatusInternalServerError, "internal", "db")
			return
		}
	} else if checkErr == nil {
		// User exists but unverified or has no password — update password
		if _, err := h.DB.Exec(ctx, `
			UPDATE users SET password_hash=$1, referral_code=COALESCE(referral_code,$2) WHERE id=$3
		`, string(hash), refCode, existingID); err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "db")
			return
		}
	} else {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	// Stash referral hint
	if code := strings.TrimSpace(body.RefCode); code != "" {
		http.SetCookie(w, &http.Cookie{
			Name:     "teleyab_ref",
			Value:    code,
			Path:     "/",
			MaxAge:   60 * 60,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
	}

	// Issue one-time email verification token
	rawToken, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "rand")
		return
	}
	tokenHash := hashToken(rawToken)
	ip := clientIP(r)
	if _, err := h.DB.Exec(ctx, `
		INSERT INTO magic_links (email, token_hash, expires_at, request_ip)
		VALUES ($1, $2, now() + interval '24 hours', NULLIF($3,'')::inet)
	`, emailAddr, tokenHash, ip); err != nil {
		log.Printf("verify link insert: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	verifyURL := fmt.Sprintf("%s/verify?token=%s", strings.TrimRight(h.Cfg.PublicBaseURL, "/"), rawToken)
	go func(to, url string) {
		ctx2, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		subject := "تأیید ایمیلِ TeleYab"
		htmlBody := fmt.Sprintf(`<div dir="rtl" style="font-family:sans-serif;padding:20px;max-width:480px">
<h2 style="color:#229ED9">خوش آمدی به TeleYab 🎉</h2>
<p>برای فعال‌سازی حسابت روی دکمه زیر کلیک کن:</p>
<p><a href="%s" style="background:#229ED9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">تأیید ایمیل</a></p>
<p style="color:#666;font-size:12px">لینک ۲۴ ساعت معتبر است.</p>
<p dir="ltr" style="font-family:monospace;color:#888;font-size:11px;word-break:break-all">%s</p>
</div>`, url, url)
		textBody := "برای تأیید ایمیلت به آدرس زیر برو:\n" + url
		if err := h.Email.Send(ctx2, to, subject, htmlBody, textBody); err != nil {
			if errors.Is(err, email.ErrNotConfigured) {
				log.Printf("[dev verify link] %s → %s", to, url)
			} else {
				log.Printf("verify email: %v", err)
			}
		}
	}(emailAddr, verifyURL)

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "email": emailAddr})
}

type authLoginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handlers) authLogin(w http.ResponseWriter, r *http.Request) {
	var body authLoginBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	emailAddr := strings.ToLower(strings.TrimSpace(body.Email))
	if !looksLikeEmail(emailAddr) {
		writeError(w, http.StatusBadRequest, "bad_email", "آدرس ایمیل معتبر نیست")
		return
	}
	if body.Password == "" {
		writeError(w, http.StatusBadRequest, "bad_password", "رمز عبور الزامی است")
		return
	}

	ctx := r.Context()
	var (
		userID        int64
		role          string
		passwordHash  *string
		bannedAt      *time.Time
		emailVerified *time.Time
	)
	err := h.DB.QueryRow(ctx, `
		SELECT id, role, password_hash, banned_at, email_verified_at
		FROM users WHERE email=$1
	`, emailAddr).Scan(&userID, &role, &passwordHash, &bannedAt, &emailVerified)

	if err == pgx.ErrNoRows || passwordHash == nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "ایمیل یا رمز عبور اشتباه است")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*passwordHash), []byte(body.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "ایمیل یا رمز عبور اشتباه است")
		return
	}

	if emailVerified == nil {
		writeError(w, http.StatusForbidden, "email_not_verified", "ابتدا ایمیلت را تأیید کن. لینک تأیید به ایمیلت ارسال شده.")
		return
	}

	if bannedAt != nil {
		writeError(w, http.StatusForbidden, "banned", "حساب شما مسدود شده است")
		return
	}

	// Apply referral cookie on first login
	if c, err := r.Cookie("teleyab_ref"); err == nil && c.Value != "" {
		var refBy *int64
		_ = h.DB.QueryRow(ctx, `SELECT id FROM users WHERE referral_code=$1`, c.Value).Scan(&refBy)
		if refBy != nil && *refBy != userID {
			_, _ = h.DB.Exec(ctx, `UPDATE users SET referred_by=$1 WHERE id=$2 AND referred_by IS NULL`, *refBy, userID)
		}
		http.SetCookie(w, &http.Cookie{Name: "teleyab_ref", Value: "", Path: "/", MaxAge: -1})
	}

	_, _ = h.DB.Exec(ctx, `UPDATE users SET last_login_at=now() WHERE id=$1`, userID)

	if _, err := h.Sessions.Issue(ctx, w, r, userID); err != nil {
		log.Printf("session issue: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "email": emailAddr, "role": role})
}

func (h *Handlers) authVerifyEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" {
		writeError(w, http.StatusBadRequest, "bad_token", "Missing token")
		return
	}

	hash := hashToken(body.Token)
	ctx := r.Context()

	var (
		linkID  int64
		emailA  string
		expires time.Time
		used    *time.Time
	)
	err := h.DB.QueryRow(ctx, `
		SELECT id, email, expires_at, consumed_at FROM magic_links WHERE token_hash=$1
	`, hash).Scan(&linkID, &emailA, &expires, &used)
	if err == pgx.ErrNoRows {
		writeError(w, http.StatusUnauthorized, "invalid_token", "لینک نامعتبر یا منقضی است")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if used != nil {
		writeError(w, http.StatusUnauthorized, "used_token", "این لینک قبلاً استفاده شده")
		return
	}
	if time.Now().After(expires) {
		writeError(w, http.StatusUnauthorized, "expired_token", "لینک منقضی شده است")
		return
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `UPDATE magic_links SET consumed_at=now() WHERE id=$1`, linkID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `
		UPDATE users SET email_verified_at=now() WHERE email=$1 AND email_verified_at IS NULL
	`, emailA); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "email": emailA})
}

func (h *Handlers) authLogout(w http.ResponseWriter, r *http.Request) {
	h.Sessions.Clear(r.Context(), w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// authForgotPassword starts a password-reset flow. Always returns 200 OK
// regardless of whether the email belongs to a real user, to avoid leaking
// account-existence to an enumerator. Email is only actually sent if the user
// exists, has a verified email, isn't banned, and hasn't issued too many
// recent tokens.
func (h *Handlers) authForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	emailAddr := strings.ToLower(strings.TrimSpace(body.Email))
	if !looksLikeEmail(emailAddr) {
		// Pretend success — don't tell the caller whether the address is well-formed.
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	ctx := r.Context()

	// Look up the user. Only verified, unbanned users get a real reset email.
	var (
		userID        int64
		bannedAt      *time.Time
		emailVerified *time.Time
	)
	err := h.DB.QueryRow(ctx, `
		SELECT id, banned_at, email_verified_at FROM users WHERE email=$1
	`, emailAddr).Scan(&userID, &bannedAt, &emailVerified)
	if err != nil {
		// pgx.ErrNoRows or anything else — return success so we don't leak.
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	if bannedAt != nil || emailVerified == nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	// Cheap rate-limit: drop tokens older than 1 hour for this user, then
	// refuse if there are already 3 still-live tokens outstanding.
	if _, err := h.DB.Exec(ctx, `
		DELETE FROM password_reset_tokens
		WHERE user_id=$1 AND created_at < now() - interval '1 hour'
	`, userID); err != nil {
		log.Printf("prt cleanup: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	var liveCount int
	if err := h.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM password_reset_tokens
		WHERE user_id=$1 AND consumed_at IS NULL AND expires_at > now()
	`, userID).Scan(&liveCount); err != nil {
		log.Printf("prt count: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	if liveCount >= 3 {
		// Silently skip the send — caller already has fresh links in their inbox.
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	rawToken, err := randomToken(32)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	tokenHash := hashToken(rawToken)
	ip := clientIP(r)
	if _, err := h.DB.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, request_ip)
		VALUES ($1, $2, now() + interval '1 hour', NULLIF($3,'')::inet)
	`, userID, tokenHash, ip); err != nil {
		log.Printf("prt insert: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(h.Cfg.WebOrigin, "/"), rawToken)
	go func(to, url string) {
		ctx2, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		subject := "بازنشانیِ رمز عبور · TeleYab"
		htmlBody := fmt.Sprintf(`<div dir="rtl" style="font-family:sans-serif;padding:20px;max-width:480px">
<h2 style="color:#229ED9">بازنشانیِ رمز عبور</h2>
<p>درخواستی برای تغییرِ رمزِ حسابت دریافت کردیم. اگر خودت بودی، روی دکمه زیر بزن:</p>
<p><a href="%s" style="background:#229ED9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">تنظیمِ رمزِ جدید</a></p>
<p style="color:#666;font-size:12px">این لینک یک ساعت معتبر است. اگر این درخواست از طرفِ تو نبود، می‌توانی این ایمیل را نادیده بگیری — رمزِ فعلی‌ات دست‌نخورده می‌ماند.</p>
<p dir="ltr" style="font-family:monospace;color:#888;font-size:11px;word-break:break-all">%s</p>
</div>`, url, url)
		textBody := "برای تنظیمِ رمزِ جدید به آدرس زیر برو (لینک یک ساعت معتبر است):\n" + url
		if err := h.Email.Send(ctx2, to, subject, htmlBody, textBody); err != nil {
			if errors.Is(err, email.ErrNotConfigured) {
				log.Printf("[dev reset link] %s → %s", to, url)
			} else {
				log.Printf("reset email: %v", err)
			}
		}
	}(emailAddr, resetURL)

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// authResetPassword consumes a reset token and sets a new password. On success,
// every existing session for the user is destroyed.
func (h *Handlers) authResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "درخواست نامعتبر است")
		return
	}
	if len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "bad_password", "رمز عبور باید حداقل ۸ کاراکتر باشد")
		return
	}

	ctx := r.Context()
	hash := hashToken(body.Token)

	var (
		tokenID int64
		userID  int64
		expires time.Time
		used    *time.Time
	)
	err := h.DB.QueryRow(ctx, `
		SELECT id, user_id, expires_at, consumed_at FROM password_reset_tokens WHERE token_hash=$1
	`, hash).Scan(&tokenID, &userID, &expires, &used)
	if err == pgx.ErrNoRows {
		writeError(w, http.StatusBadRequest, "invalid_token", "لینک نامعتبر است")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if used != nil {
		writeError(w, http.StatusGone, "used_token", "این لینک قبلاً استفاده شده است")
		return
	}
	if time.Now().After(expires) {
		writeError(w, http.StatusGone, "expired_token", "لینک منقضی شده است")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "Could not hash password")
		return
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `UPDATE users SET password_hash=$1 WHERE id=$2`, string(newHash), userID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE password_reset_tokens SET consumed_at=now() WHERE id=$1`, tokenID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `DELETE FROM sessions WHERE user_id=$1`, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	// Clear the cookie on this device too (the row is already gone, but the
	// stale cookie can mislead the UI).
	h.Sessions.Clear(ctx, w, r)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) me(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	var (
		emailA   string
		bal      float64
		role     string
		refCode  *string
		bannedAt *time.Time
	)
	err = h.DB.QueryRow(r.Context(), `
		SELECT email, balance_toman, role, referral_code, banned_at FROM users WHERE id=$1
	`, uid).Scan(&emailA, &bal, &role, &refCode, &bannedAt)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	if bannedAt != nil {
		writeError(w, http.StatusForbidden, "banned", "Your account is suspended")
		return
	}
	price := h.DB.GetSettingFloat(r.Context(), "price_per_lookup_toman", config.FirstRunPricePerLookupToman)
	writeJSON(w, http.StatusOK, map[string]any{
		"email":                  emailA,
		"balance_toman":          bal,
		"role":                   role,
		"price_per_lookup_toman": price,
		"referral_code":          ptrStr(refCode),
	})
}

// ──────────────────────── public pricing ────────────────────────────────

func (h *Handlers) publicPricing(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	price := h.DB.GetSettingFloat(ctx, "price_per_lookup_toman", config.FirstRunPricePerLookupToman)
	minA := h.DB.GetSettingFloat(ctx, "min_topup_toman", config.FirstRunMinTopupToman)
	maxA := h.DB.GetSettingFloat(ctx, "max_topup_toman", config.FirstRunMaxTopupToman)
	refBonus := h.DB.GetSettingFloat(ctx, "referral_bonus_toman", 200000)
	cacheDays := int(h.DB.GetSettingFloat(ctx, "lookup_cache_days", 0))
	cardNum := h.DB.GetSettingString(ctx, "bank_card_number", "")
	cardHolder := h.DB.GetSettingString(ctx, "bank_card_holder", "")
	bankName := h.DB.GetSettingString(ctx, "bank_name", "")
	writeJSON(w, http.StatusOK, map[string]any{
		"price_per_lookup_toman": price,
		"min_topup_toman":        minA,
		"max_topup_toman":        maxA,
		"referral_bonus_toman":   refBonus,
		"lookup_cache_days":      cacheDays,
		"bank_card_number":       cardNum,
		"bank_card_holder":       cardHolder,
		"bank_name":              bankName,
	})
}

// ──────────────────────── lookup (with cache + quota) ───────────────────

type lookupBody struct {
	Query string `json:"query"`
}

func (h *Handlers) lookup(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	var body lookupBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	h.doLookup(w, r, uid, strings.TrimSpace(body.Query), false)
}

// doLookup is the shared implementation used by /api/lookup (session) and
// /api/v1/lookup (api-key). It enforces ban, quota, balance, cache, and
// performs the atomic charge.
func (h *Handlers) doLookup(w http.ResponseWriter, r *http.Request, uid int64, query string, viaAPIKey bool) {
	ctx := r.Context()
	if query == "" {
		writeError(w, http.StatusBadRequest, "bad_query", "Query required")
		return
	}
	if len(query) > 128 {
		writeError(w, http.StatusBadRequest, "bad_query", "Query too long")
		return
	}

	// Ban check.
	var banned *time.Time
	_ = h.DB.QueryRow(ctx, `SELECT banned_at FROM users WHERE id=$1`, uid).Scan(&banned)
	if banned != nil {
		writeError(w, http.StatusForbidden, "banned", "Account suspended")
		return
	}

	// Per-user hourly quota.
	quota := int(h.DB.GetSettingFloat(ctx, "per_user_hourly_quota", 60))
	var recentCount int
	_ = h.DB.QueryRow(ctx, `
		SELECT count(*) FROM lookups
		WHERE user_id=$1 AND created_at > now() - interval '1 hour' AND success
	`, uid).Scan(&recentCount)
	if recentCount >= quota {
		writeError(w, http.StatusTooManyRequests, "quota_exceeded", "Hourly lookup quota reached; try later")
		return
	}

	price := h.DB.GetSettingFloat(ctx, "price_per_lookup_toman", config.FirstRunPricePerLookupToman)
	cacheDays := int(h.DB.GetSettingFloat(ctx, "lookup_cache_days", 0))

	// v1.5: lookup cache. If enabled, serve previous successful lookup of the
	// same query (by lower(query)) from this same user within N days at cost 0.
	if cacheDays > 0 {
		var (
			cachedID  int64
			country   *string
			numbers   *string
			addData   *string
			createdAt time.Time
		)
		err := h.DB.QueryRow(ctx, `
			SELECT id, country, numbers::text, additional_data::text, created_at
			FROM lookups
			WHERE user_id=$1 AND lower(query)=lower($2) AND success
			  AND created_at > now() - ($3 || ' days')::interval
			ORDER BY created_at DESC
			LIMIT 1
		`, uid, query, cacheDays).Scan(&cachedID, &country, &numbers, &addData, &createdAt)
		if err == nil {
			// Persist a free cache-hit row for accounting.
			var newID int64
			_ = h.DB.QueryRow(ctx, `
				INSERT INTO lookups (user_id, query, success, country, numbers, additional_data, cost_toman, served_from_cache)
				VALUES ($1, $2, TRUE, $3, COALESCE($4::jsonb,'[]'::jsonb), COALESCE($5::jsonb,'null'::jsonb), 0, $6)
				RETURNING id
			`, uid, query, country, numbers, addData, cachedID).Scan(&newID)
			var balance float64
			_ = h.DB.QueryRow(ctx, `SELECT balance_toman FROM users WHERE id=$1`, uid).Scan(&balance)
			writeJSON(w, http.StatusOK, map[string]any{
				"success":                true,
				"query":                  query,
				"numbers":                jsonStrSlice(numbers),
				"country":                ptrStr(country),
				"cost_toman":             0,
				"balance_toman":          balance,
				"price_per_lookup_toman": price,
				"cached":                 true,
			})
			return
		}
	}

	// Pre-flight balance check.
	var balance float64
	if err := h.DB.QueryRow(ctx, `SELECT balance_toman FROM users WHERE id=$1`, uid).Scan(&balance); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if balance < price {
		writeJSON(w, http.StatusPaymentRequired, map[string]any{
			"success":                false,
			"error":                  "insufficient_balance",
			"balance_toman":          balance,
			"price_per_lookup_toman": price,
		})
		return
	}

	res, err := h.Upstream.Lookup(ctx, query)
	if err != nil {
		log.Printf("upstream lookup: %v", err)
		_, _ = h.DB.Exec(ctx, `
			INSERT INTO lookups (user_id, query, success, error, cost_toman)
			VALUES ($1, $2, FALSE, $3, 0)
		`, uid, query, err.Error())
		writeError(w, http.StatusBadGateway, "upstream_unavailable", "Lookup service unavailable, try again")
		return
	}

	// Low-balance operator alert (fire and forget, deduped to once per hour).
	go h.maybeAlertLowBalance(res.TokensRemaining)

	var lookupID int64
	if !res.Success {
		err = h.DB.QueryRow(ctx, `
			INSERT INTO lookups (user_id, query, success, error, cost_toman, upstream_tokens_remaining, provider)
			VALUES ($1, $2, FALSE, $3, 0, $4, $5)
			RETURNING id
		`, uid, query, res.Error, res.TokensRemaining, nullable(res.Provider)).Scan(&lookupID)
		if err != nil {
			log.Printf("lookup insert (fail): %v", err)
		}
		// Abuse heuristic check (lazy).
		go h.maybeFlagAbuse(uid)
		writeJSON(w, http.StatusOK, map[string]any{
			"success":                false,
			"error":                  res.Error,
			"balance_toman":          balance,
			"price_per_lookup_toman": price,
		})
		return
	}

	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var newBalance float64
	if err := tx.QueryRow(ctx, `
		UPDATE users SET balance_toman = balance_toman - $1
		WHERE id = $2 AND balance_toman >= $1
		RETURNING balance_toman
	`, price, uid).Scan(&newBalance); err != nil {
		if err == pgx.ErrNoRows {
			// Funds disappeared between checks. Queue a refund row so an admin
			// can review whether upstream charged us but customer didn't pay.
			_, _ = h.DB.Exec(ctx, `
				INSERT INTO refund_queue (user_id, amount_toman, reason)
				VALUES ($1, $2, 'balance gap on success')
			`, uid, price)
			writeError(w, http.StatusPaymentRequired, "insufficient_balance", "Balance dropped between checks; please top up.")
			return
		}
		log.Printf("balance debit: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	numbersJSON, _ := json.Marshal(res.Numbers)
	addJSON := res.AdditionalData
	if len(addJSON) == 0 {
		addJSON = []byte("null")
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO lookups (user_id, query, success, country, numbers, additional_data, cost_toman, upstream_tokens_remaining, provider)
		VALUES ($1, $2, TRUE, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
		RETURNING id
	`, uid, query, res.Country, string(numbersJSON), string(addJSON), price, res.TokensRemaining, nullable(res.Provider)).Scan(&lookupID); err != nil {
		log.Printf("lookup insert: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference)
		VALUES ($1, $2, 'charge', $3)
	`, uid, -price, fmt.Sprintf("lookup:%d", lookupID)); err != nil {
		log.Printf("wallet charge: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	// Referral bonus is no longer paid here — it is awarded only when the
	// referred user's first top-up gets approved by an admin (see
	// adminApprovePayment).  A successful lookup is no longer enough.

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success":                true,
		"query":                  res.Query,
		"numbers":                res.Numbers,
		"country":                res.Country,
		"additional_data":        res.AdditionalData,
		"cost_toman":             price,
		"balance_toman":          newBalance,
		"price_per_lookup_toman": price,
		"provider":               res.Provider,
	})
}

func (h *Handlers) lookupHistory(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, query, success, country, numbers, error, cost_toman, created_at, served_from_cache
		FROM lookups
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()

	type row struct {
		ID         int64           `json:"id"`
		Query      string          `json:"query"`
		Success    bool            `json:"success"`
		Country    *string         `json:"country,omitempty"`
		Numbers    json.RawMessage `json:"numbers,omitempty"`
		Error      *string         `json:"error,omitempty"`
		CostToman  float64         `json:"cost_toman"`
		CreatedAt  time.Time       `json:"created_at"`
		FromCache  *int64          `json:"from_cache,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		var nums *string
		if err := rows.Scan(&r.ID, &r.Query, &r.Success, &r.Country, &nums, &r.Error, &r.CostToman, &r.CreatedAt, &r.FromCache); err != nil {
			continue
		}
		if nums != nil {
			r.Numbers = json.RawMessage(*nums)
		}
		out = append(out, r)
	}
	writeJSON(w, http.StatusOK, map[string]any{"lookups": out})
}

// ──────────────────────── top-up (card-to-card) ──────────────────────────

func (h *Handlers) topupRequest(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 12<<20)

	var amount int64
	var ref, card, imagePath string

	if err := r.ParseMultipartForm(12 << 20); err == nil {
		amount, _ = strconv.ParseInt(r.FormValue("amount_toman"), 10, 64)
		ref = r.FormValue("reference_number")
		card = r.FormValue("sender_card")

		file, header, fErr := r.FormFile("receipt_image")
		if fErr == nil {
			defer file.Close()
			ext := strings.ToLower(filepath.Ext(header.Filename))
			if ext == "" {
				ext = ".jpg"
			}
			allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".pdf": true}
			if !allowed[ext] {
				writeError(w, http.StatusBadRequest, "bad_file", "Only image files are allowed (jpg, png, webp, pdf)")
				return
			}
			filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), generateRefCode(), ext)
			dst, cErr := os.Create(filepath.Join(h.UploadDir, filename))
			if cErr != nil {
				log.Printf("upload create: %v", cErr)
				writeError(w, http.StatusInternalServerError, "internal", "Could not save file")
				return
			}
			defer dst.Close()
			if _, cErr = io.Copy(dst, file); cErr != nil {
				log.Printf("upload write: %v", cErr)
				writeError(w, http.StatusInternalServerError, "internal", "Could not save file")
				return
			}
			imagePath = filename
		}
	} else {
		var body struct {
			AmountToman     int64  `json:"amount_toman"`
			ReferenceNumber string `json:"reference_number"`
			SenderCard      string `json:"sender_card"`
		}
		if err2 := json.NewDecoder(r.Body).Decode(&body); err2 != nil {
			writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
			return
		}
		amount = body.AmountToman
		ref = body.ReferenceNumber
		card = body.SenderCard
	}

	ctx := r.Context()
	minA := int64(h.DB.GetSettingFloat(ctx, "min_topup_toman", config.FirstRunMinTopupToman))
	maxA := int64(h.DB.GetSettingFloat(ctx, "max_topup_toman", config.FirstRunMaxTopupToman))
	if amount < minA || amount > maxA {
		writeError(w, http.StatusBadRequest, "bad_amount", fmt.Sprintf("مبلغ باید بین %d و %d تومان باشد", minA, maxA))
		return
	}

	var reqID int64
	if err := h.DB.QueryRow(ctx, `
		INSERT INTO payment_requests (user_id, amount_toman, reference_number, sender_card, receipt_image)
		VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), NULLIF($5,''))
		RETURNING id
	`, uid, amount, ref, card, imagePath).Scan(&reqID); err != nil {
		log.Printf("payment_request insert: %v", err)
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": reqID})
}

func (h *Handlers) topupMyRequests(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, amount_toman, reference_number, sender_card, receipt_image, status, admin_note, created_at, resolved_at
		FROM payment_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50
	`, uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID         int64      `json:"id"`
		Amount     float64    `json:"amount_toman"`
		Reference  *string    `json:"reference_number,omitempty"`
		SenderCard *string    `json:"sender_card,omitempty"`
		HasImage   bool       `json:"has_image"`
		Status     string     `json:"status"`
		AdminNote  *string    `json:"admin_note,omitempty"`
		CreatedAt  time.Time  `json:"created_at"`
		ResolvedAt *time.Time `json:"resolved_at,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var ro row
		var img *string
		if err := rows.Scan(&ro.ID, &ro.Amount, &ro.Reference, &ro.SenderCard, &img, &ro.Status, &ro.AdminNote, &ro.CreatedAt, &ro.ResolvedAt); err == nil {
			ro.HasImage = img != nil && *img != ""
			out = append(out, ro)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"requests": out})
}

func (h *Handlers) serveReceiptImage(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	filename := chi.URLParam(r, "filename")
	if strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid filename")
		return
	}

	var role string
	_ = h.DB.QueryRow(r.Context(), `SELECT role FROM users WHERE id=$1`, uid).Scan(&role)
	if role != "admin" {
		var count int
		_ = h.DB.QueryRow(r.Context(), `
			SELECT count(*) FROM payment_requests WHERE user_id=$1 AND receipt_image=$2
		`, uid, filename).Scan(&count)
		if count == 0 {
			writeError(w, http.StatusForbidden, "forbidden", "")
			return
		}
	}
	http.ServeFile(w, r, filepath.Join(h.UploadDir, filename))
}

// ──────────────────────── referrals ────────────────────────────────

func (h *Handlers) myReferral(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	var code *string
	_ = h.DB.QueryRow(r.Context(), `SELECT referral_code FROM users WHERE id=$1`, uid).Scan(&code)
	if code == nil || *code == "" {
		c := generateRefCode()
		_, _ = h.DB.Exec(r.Context(), `UPDATE users SET referral_code=$1 WHERE id=$2 AND (referral_code IS NULL OR referral_code='')`, c, uid)
		code = &c
	}
	var (
		invited int64
		earned  float64
	)
	_ = h.DB.QueryRow(r.Context(), `SELECT count(*) FROM users WHERE referred_by=$1`, uid).Scan(&invited)
	_ = h.DB.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(amount_toman),0)
		FROM wallet_transactions WHERE user_id=$1 AND kind='adjustment' AND reference LIKE 'referral:%'
	`, uid).Scan(&earned)
	bonus := h.DB.GetSettingFloat(r.Context(), "referral_bonus_toman", 200000)
	writeJSON(w, http.StatusOK, map[string]any{
		"code":           ptrStr(code),
		"invited_count":  invited,
		"earned_toman":   earned,
		"bonus_toman":    bonus,
		"share_url":      fmt.Sprintf("%s/?ref=%s", strings.TrimRight(h.Cfg.WebOrigin, "/"), ptrStr(code)),
	})
}

func (h *Handlers) maybeApplyReferralBonus(ctx context.Context, tx pgx.Tx, uid int64) {
	var (
		refBy *int64
		paid  bool
	)
	err := tx.QueryRow(ctx, `SELECT referred_by, referral_bonus_paid FROM users WHERE id=$1`, uid).Scan(&refBy, &paid)
	if err != nil || refBy == nil || paid {
		return
	}
	// Self-referral defence in depth (also blocked at signup time but cheap to
	// re-check here in case the row was mutated by an admin tool).
	if *refBy == uid {
		return
	}
	// Don't credit a banned/flagged/inactive referrer or a referrer that has
	// since been deleted. The referee is the user whose top-up just landed,
	// so we trust the auth check that got them here.
	var (
		refActive   bool
		refBanned   *time.Time
		refFlagged  *time.Time
	)
	if err := tx.QueryRow(ctx, `SELECT is_active, banned_at, flagged_at FROM users WHERE id=$1`, *refBy).Scan(&refActive, &refBanned, &refFlagged); err != nil {
		return
	}
	if !refActive || refBanned != nil || refFlagged != nil {
		// Mark as "paid" so we don't keep checking on every future top-up.
		_, _ = tx.Exec(ctx, `UPDATE users SET referral_bonus_paid=TRUE WHERE id=$1`, uid)
		return
	}
	bonus := h.DB.GetSettingFloat(ctx, "referral_bonus_toman", 200000)
	if bonus <= 0 {
		return
	}
	// credit both sides
	for _, target := range []int64{*refBy, uid} {
		if _, err := tx.Exec(ctx, `UPDATE users SET balance_toman = balance_toman + $1 WHERE id=$2`, bonus, target); err != nil {
			return
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference)
			VALUES ($1, $2, 'adjustment', $3)
		`, target, bonus, fmt.Sprintf("referral:%d", uid)); err != nil {
			return
		}
	}
	_, _ = tx.Exec(ctx, `UPDATE users SET referral_bonus_paid=TRUE WHERE id=$1`, uid)
}

// ──────────────────────── public API (Bearer keys) ────────────────────────

type apiKeyClaim struct {
	UserID int64
}

func (h *Handlers) authAPIKey(r *http.Request) (int64, bool) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return 0, false
	}
	raw := strings.TrimSpace(auth[7:])
	if raw == "" {
		return 0, false
	}
	hash := hashToken(raw)
	var uid int64
	err := h.DB.QueryRow(r.Context(), `
		SELECT user_id FROM api_keys
		WHERE key_hash=$1 AND revoked_at IS NULL
	`, hash).Scan(&uid)
	if err != nil {
		return 0, false
	}
	_, _ = h.DB.Exec(r.Context(), `UPDATE api_keys SET last_used_at=now() WHERE key_hash=$1`, hash)
	return uid, true
}

func (h *Handlers) publicAPILookup(w http.ResponseWriter, r *http.Request) {
	if !strings.EqualFold(h.DB.GetSettingString(r.Context(), "public_api_enabled", "true"), "true") {
		writeError(w, http.StatusServiceUnavailable, "disabled", "Public API disabled")
		return
	}
	uid, ok := h.authAPIKey(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Bearer API key required")
		return
	}
	var body lookupBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	h.doLookup(w, r, uid, strings.TrimSpace(body.Query), true)
}

// ──────────────────────── api keys ────────────────────────────────

func (h *Handlers) listKeys(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, key_prefix, name, last_used_at, revoked_at, created_at
		FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC
	`, uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID         int64      `json:"id"`
		KeyPrefix  string     `json:"key_prefix"`
		Name       *string    `json:"name,omitempty"`
		LastUsedAt *time.Time `json:"last_used_at,omitempty"`
		RevokedAt  *time.Time `json:"revoked_at,omitempty"`
		CreatedAt  time.Time  `json:"created_at"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.KeyPrefix, &r.Name, &r.LastUsedAt, &r.RevokedAt, &r.CreatedAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": out})
}

type createKeyBody struct {
	Name string `json:"name"`
}

func (h *Handlers) createKey(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	var body createKeyBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	raw, err := randomToken(28)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "rand")
		return
	}
	full := "tly_" + raw
	hash := hashToken(full)
	prefix := full[:10] + "…"
	var id int64
	if err := h.DB.QueryRow(r.Context(), `
		INSERT INTO api_keys (user_id, key_prefix, key_hash, name) VALUES ($1, $2, $3, NULLIF($4,''))
		RETURNING id
	`, uid, prefix, hash, body.Name).Scan(&id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":     id,
		"key":    full, // shown ONCE
		"prefix": prefix,
	})
}

func (h *Handlers) revokeKey(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.ParseInt(idStr, 10, 64)
	if _, err := h.DB.Exec(r.Context(), `
		UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL
	`, id, uid); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ──────────────────────── bulk batches ────────────────────────────

type batchBody struct {
	Queries []string `json:"queries"`
	Name    string   `json:"name,omitempty"`
}

func (h *Handlers) createBatch(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	var body batchBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	// dedupe / clean
	seen := map[string]bool{}
	clean := body.Queries[:0]
	for _, q := range body.Queries {
		q = strings.TrimSpace(q)
		if q == "" || len(q) > 128 || seen[q] {
			continue
		}
		seen[q] = true
		clean = append(clean, q)
	}
	maxRows := int(h.DB.GetSettingFloat(r.Context(), "bulk_import_max_rows", 500))
	if len(clean) == 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "No queries")
		return
	}
	if len(clean) > maxRows {
		writeError(w, http.StatusBadRequest, "too_many", fmt.Sprintf("Max %d rows", maxRows))
		return
	}

	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var batchID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO lookup_batches (user_id, name, total, status) VALUES ($1, NULLIF($2,''), $3, 'queued')
		RETURNING id
	`, uid, body.Name, len(clean)).Scan(&batchID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	for _, q := range clean {
		if _, err := tx.Exec(ctx, `INSERT INTO lookup_batch_items (batch_id, query) VALUES ($1, $2)`, batchID, q); err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "db")
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}

	// Kick off background worker (per-batch, sequential — keeps atomic-charge rules trivial).
	go h.runBatch(batchID, uid)

	writeJSON(w, http.StatusOK, map[string]any{"id": batchID, "total": len(clean)})
}

func (h *Handlers) runBatch(batchID, uid int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	_, _ = h.DB.Exec(ctx, `UPDATE lookup_batches SET status='running' WHERE id=$1`, batchID)

	rows, err := h.DB.Query(ctx, `SELECT id, query FROM lookup_batch_items WHERE batch_id=$1 AND status='pending' ORDER BY id`, batchID)
	if err != nil {
		_, _ = h.DB.Exec(ctx, `UPDATE lookup_batches SET status='failed' WHERE id=$1`, batchID)
		return
	}
	type item struct {
		id    int64
		query string
	}
	items := []item{}
	for rows.Next() {
		var it item
		if err := rows.Scan(&it.id, &it.query); err == nil {
			items = append(items, it)
		}
	}
	rows.Close()

	for _, it := range items {
		// Check ban / balance before each row.
		var banned *time.Time
		_ = h.DB.QueryRow(ctx, `SELECT banned_at FROM users WHERE id=$1`, uid).Scan(&banned)
		if banned != nil {
			_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='skipped', error='banned', finished_at=now() WHERE id=$1`, it.id)
			continue
		}
		price := h.DB.GetSettingFloat(ctx, "price_per_lookup_toman", config.FirstRunPricePerLookupToman)
		var balance float64
		_ = h.DB.QueryRow(ctx, `SELECT balance_toman FROM users WHERE id=$1`, uid).Scan(&balance)
		if balance < price {
			_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='skipped', error='insufficient_balance', finished_at=now() WHERE id=$1`, it.id)
			continue
		}

		_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='running' WHERE id=$1`, it.id)
		res, err := h.Upstream.Lookup(ctx, it.query)
		if err != nil {
			_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='error', error=$1, finished_at=now() WHERE id=$2`, err.Error(), it.id)
			continue
		}
		var lookupID int64
		if !res.Success {
			_ = h.DB.QueryRow(ctx, `
				INSERT INTO lookups (user_id, query, success, error, cost_toman, upstream_tokens_remaining, provider)
				VALUES ($1, $2, FALSE, $3, 0, $4, $5) RETURNING id
			`, uid, it.query, res.Error, res.TokensRemaining, nullable(res.Provider)).Scan(&lookupID)
			_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='done', lookup_id=$1, finished_at=now() WHERE id=$2`, lookupID, it.id)
			_, _ = h.DB.Exec(ctx, `UPDATE lookup_batches SET completed=completed+1 WHERE id=$1`, batchID)
			continue
		}
		// success: atomic charge
		tx, err := h.DB.Begin(ctx)
		if err != nil {
			continue
		}
		if _, err := tx.Exec(ctx, `UPDATE users SET balance_toman=balance_toman-$1 WHERE id=$2 AND balance_toman>=$1`, price, uid); err != nil {
			_ = tx.Rollback(ctx)
			continue
		}
		numbersJSON, _ := json.Marshal(res.Numbers)
		addJSON := res.AdditionalData
		if len(addJSON) == 0 {
			addJSON = []byte("null")
		}
		if err := tx.QueryRow(ctx, `
			INSERT INTO lookups (user_id, query, success, country, numbers, additional_data, cost_toman, upstream_tokens_remaining, provider)
			VALUES ($1, $2, TRUE, $3, $4::jsonb, $5::jsonb, $6, $7, $8) RETURNING id
		`, uid, it.query, res.Country, string(numbersJSON), string(addJSON), price, res.TokensRemaining, nullable(res.Provider)).Scan(&lookupID); err != nil {
			_ = tx.Rollback(ctx)
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference) VALUES ($1, $2, 'charge', $3)`, uid, -price, fmt.Sprintf("batch:%d:%d", batchID, lookupID)); err != nil {
			_ = tx.Rollback(ctx)
			continue
		}
		if err := tx.Commit(ctx); err != nil {
			continue
		}
		_, _ = h.DB.Exec(ctx, `UPDATE lookup_batch_items SET status='done', lookup_id=$1, finished_at=now() WHERE id=$2`, lookupID, it.id)
		_, _ = h.DB.Exec(ctx, `UPDATE lookup_batches SET completed=completed+1, successful=successful+1, cost_toman=cost_toman+$1 WHERE id=$2`, price, batchID)
	}
	_, _ = h.DB.Exec(ctx, `UPDATE lookup_batches SET status='completed', completed_at=now() WHERE id=$1`, batchID)
}

func (h *Handlers) listBatches(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, name, total, completed, successful, cost_toman, status, created_at, completed_at
		FROM lookup_batches WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50
	`, uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID          int64      `json:"id"`
		Name        *string    `json:"name,omitempty"`
		Total       int        `json:"total"`
		Completed   int        `json:"completed"`
		Successful  int        `json:"successful"`
		CostToman   float64    `json:"cost_toman"`
		Status      string     `json:"status"`
		CreatedAt   time.Time  `json:"created_at"`
		CompletedAt *time.Time `json:"completed_at,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Name, &r.Total, &r.Completed, &r.Successful, &r.CostToman, &r.Status, &r.CreatedAt, &r.CompletedAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"batches": out})
}

func (h *Handlers) getBatch(w http.ResponseWriter, r *http.Request) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return
	}
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.ParseInt(idStr, 10, 64)
	var (
		name        *string
		total       int
		completed   int
		successful  int
		costToman   float64
		status      string
		createdAt   time.Time
		completedAt *time.Time
	)
	err = h.DB.QueryRow(r.Context(), `
		SELECT name, total, completed, successful, cost_toman, status, created_at, completed_at
		FROM lookup_batches WHERE id=$1 AND user_id=$2
	`, id, uid).Scan(&name, &total, &completed, &successful, &costToman, &status, &createdAt, &completedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "batch")
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT bi.id, bi.query, bi.status, bi.error, l.success, l.numbers, l.country
		FROM lookup_batch_items bi
		LEFT JOIN lookups l ON l.id = bi.lookup_id
		WHERE bi.batch_id=$1 ORDER BY bi.id LIMIT 1000
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type item struct {
		ID      int64           `json:"id"`
		Query   string          `json:"query"`
		Status  string          `json:"status"`
		Error   *string         `json:"error,omitempty"`
		Success *bool           `json:"success,omitempty"`
		Numbers json.RawMessage `json:"numbers,omitempty"`
		Country *string         `json:"country,omitempty"`
	}
	items := []item{}
	for rows.Next() {
		var it item
		var nums *string
		if err := rows.Scan(&it.ID, &it.Query, &it.Status, &it.Error, &it.Success, &nums, &it.Country); err == nil {
			if nums != nil {
				it.Numbers = json.RawMessage(*nums)
			}
			items = append(items, it)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":           id,
		"name":         ptrStr(name),
		"total":        total,
		"completed":    completed,
		"successful":   successful,
		"cost_toman":   costToman,
		"status":       status,
		"created_at":   createdAt,
		"completed_at": completedAt,
		"items":        items,
	})
}

// ──────────────────────── admin ────────────────────────────────

func (h *Handlers) requireAdmin(w http.ResponseWriter, r *http.Request) (int64, bool) {
	uid, err := h.Sessions.UserID(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in")
		return 0, false
	}
	var role string
	if err := h.DB.QueryRow(r.Context(), `SELECT role FROM users WHERE id=$1`, uid).Scan(&role); err != nil || role != "admin" {
		writeError(w, http.StatusForbidden, "forbidden", "Admin only")
		return 0, false
	}
	return uid, true
}

func (h *Handlers) adminUpstreamBalance(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	per := h.Upstream.BalancePerProvider(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"providers": per})
}

func (h *Handlers) adminStats(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	ctx := r.Context()
	type stats struct {
		UserCount         int64   `json:"user_count"`
		ActiveUsers7d     int64   `json:"active_users_7d"`
		LookupCount       int64   `json:"lookup_count"`
		SuccessfulLookups int64   `json:"successful_lookups"`
		RevenueToman      float64 `json:"revenue_toman"`
		TotalToppedToman  float64 `json:"total_topped_toman"`
		HeldBalance       float64 `json:"held_balance_toman"`
		FlaggedUsers      int64   `json:"flagged_users"`
		BannedUsers       int64   `json:"banned_users"`
		PendingRefunds    int64   `json:"pending_refunds"`
		PendingPayments   int64   `json:"pending_payments"`
	}
	var s stats
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&s.UserCount)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM users WHERE last_login_at > now() - interval '7 days'`).Scan(&s.ActiveUsers7d)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM lookups`).Scan(&s.LookupCount)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM lookups WHERE success`).Scan(&s.SuccessfulLookups)
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(cost_toman),0) FROM lookups WHERE success`).Scan(&s.RevenueToman)
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(amount_toman),0) FROM payment_requests WHERE status='approved'`).Scan(&s.TotalToppedToman)
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(balance_toman),0) FROM users`).Scan(&s.HeldBalance)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM users WHERE flagged_at IS NOT NULL`).Scan(&s.FlaggedUsers)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM users WHERE banned_at IS NOT NULL`).Scan(&s.BannedUsers)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM refund_queue WHERE status='pending'`).Scan(&s.PendingRefunds)
	_ = h.DB.QueryRow(ctx, `SELECT count(*) FROM payment_requests WHERE status='pending'`).Scan(&s.PendingPayments)
	writeJSON(w, http.StatusOK, s)
}

// settings
func (h *Handlers) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	rows, err := h.DB.Query(r.Context(), `SELECT key, value FROM settings ORDER BY key`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			out[k] = v
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handlers) adminPatchSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	for k, v := range body {
		s := fmt.Sprintf("%v", v)
		if err := h.DB.SetSettingString(r.Context(), k, s); err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "db")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// users
func (h *Handlers) adminListUsers(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	var rows pgx.Rows
	var err error
	if q != "" {
		rows, err = h.DB.Query(r.Context(), `
			SELECT id, email, role, balance_toman, banned_at, flagged_at, created_at, last_login_at
			FROM users WHERE email ILIKE '%'||$1||'%' ORDER BY created_at DESC LIMIT 200
		`, q)
	} else {
		rows, err = h.DB.Query(r.Context(), `
			SELECT id, email, role, balance_toman, banned_at, flagged_at, created_at, last_login_at
			FROM users ORDER BY created_at DESC LIMIT 200
		`)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID           int64      `json:"id"`
		Email        string     `json:"email"`
		Role         string     `json:"role"`
		BalanceToman float64    `json:"balance_toman"`
		BannedAt     *time.Time `json:"banned_at,omitempty"`
		FlaggedAt    *time.Time `json:"flagged_at,omitempty"`
		CreatedAt    time.Time  `json:"created_at"`
		LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Email, &r.Role, &r.BalanceToman, &r.BannedAt, &r.FlaggedAt, &r.CreatedAt, &r.LastLoginAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": out})
}

func (h *Handlers) adminGetUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var (
		email     string
		role      string
		balance   float64
		bannedAt  *time.Time
		flaggedAt *time.Time
		banReason *string
		flagReason *string
		createdAt time.Time
		lastLogin *time.Time
	)
	err := h.DB.QueryRow(r.Context(), `
		SELECT email, role, balance_toman, banned_at, flagged_at, ban_reason, flag_reason, created_at, last_login_at
		FROM users WHERE id=$1
	`, id).Scan(&email, &role, &balance, &bannedAt, &flaggedAt, &banReason, &flagReason, &createdAt, &lastLogin)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "user")
		return
	}
	// recent lookups
	lookupRows, _ := h.DB.Query(r.Context(), `
		SELECT id, query, success, country, numbers, error, cost_toman, created_at
		FROM lookups WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50
	`, id)
	type lkRow struct {
		ID        int64           `json:"id"`
		Query     string          `json:"query"`
		Success   bool            `json:"success"`
		Country   *string         `json:"country,omitempty"`
		Numbers   json.RawMessage `json:"numbers,omitempty"`
		Error     *string         `json:"error,omitempty"`
		CostToman float64         `json:"cost_toman"`
		CreatedAt time.Time       `json:"created_at"`
	}
	lookups := []lkRow{}
	if lookupRows != nil {
		for lookupRows.Next() {
			var r lkRow
			var nums *string
			if err := lookupRows.Scan(&r.ID, &r.Query, &r.Success, &r.Country, &nums, &r.Error, &r.CostToman, &r.CreatedAt); err == nil {
				if nums != nil {
					r.Numbers = json.RawMessage(*nums)
				}
				lookups = append(lookups, r)
			}
		}
		lookupRows.Close()
	}
	// recent wallet transactions
	txRows, _ := h.DB.Query(r.Context(), `
		SELECT id, amount_toman, kind, reference, created_at
		FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50
	`, id)
	type txRow struct {
		ID        int64     `json:"id"`
		Amount    float64   `json:"amount_toman"`
		Kind      string    `json:"kind"`
		Reference *string   `json:"reference,omitempty"`
		CreatedAt time.Time `json:"created_at"`
	}
	txs := []txRow{}
	if txRows != nil {
		for txRows.Next() {
			var r txRow
			if err := txRows.Scan(&r.ID, &r.Amount, &r.Kind, &r.Reference, &r.CreatedAt); err == nil {
				txs = append(txs, r)
			}
		}
		txRows.Close()
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":            id,
		"email":         email,
		"role":          role,
		"balance_toman": balance,
		"banned_at":     bannedAt,
		"flagged_at":    flaggedAt,
		"ban_reason":    ptrStr(banReason),
		"flag_reason":   ptrStr(flagReason),
		"created_at":    createdAt,
		"last_login_at": lastLogin,
		"lookups":       lookups,
		"transactions":  txs,
	})
}

type adminReasonBody struct {
	Reason string `json:"reason,omitempty"`
}

func (h *Handlers) adminBanUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body adminReasonBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	if _, err := h.DB.Exec(r.Context(), `
		UPDATE users SET banned_at=now(), ban_reason=NULLIF($1,'') WHERE id=$2
	`, body.Reason, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	// force logout too
	_, _ = h.DB.Exec(r.Context(), `DELETE FROM sessions WHERE user_id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminUnbanUser(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := h.DB.Exec(r.Context(), `UPDATE users SET banned_at=NULL, ban_reason=NULL WHERE id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminForceLogout(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := h.DB.Exec(r.Context(), `DELETE FROM sessions WHERE user_id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type adjustBody struct {
	AmountToman float64 `json:"amount_toman"`
	Reason      string  `json:"reason"`
}

func (h *Handlers) adminAdjustBalance(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body adjustBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AmountToman == 0 {
		writeError(w, http.StatusBadRequest, "bad_request", "amount required")
		return
	}
	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()
	if _, err := tx.Exec(r.Context(), `UPDATE users SET balance_toman=balance_toman+$1 WHERE id=$2`, body.AmountToman, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(r.Context(), `INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference) VALUES ($1, $2, 'adjustment', $3)`,
		id, body.AmountToman, "admin:"+body.Reason); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// refunds
func (h *Handlers) adminListRefunds(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT r.id, r.user_id, u.email, r.lookup_id, r.amount_toman, r.reason, r.status, r.note, r.created_at, r.resolved_at
		FROM refund_queue r LEFT JOIN users u ON u.id=r.user_id
		ORDER BY r.created_at DESC LIMIT 200
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID         int64      `json:"id"`
		UserID     int64      `json:"user_id"`
		Email      *string    `json:"email,omitempty"`
		LookupID   *int64     `json:"lookup_id,omitempty"`
		Amount     float64    `json:"amount_toman"`
		Reason     *string    `json:"reason,omitempty"`
		Status     string     `json:"status"`
		Note       *string    `json:"note,omitempty"`
		CreatedAt  time.Time  `json:"created_at"`
		ResolvedAt *time.Time `json:"resolved_at,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.UserID, &r.Email, &r.LookupID, &r.Amount, &r.Reason, &r.Status, &r.Note, &r.CreatedAt, &r.ResolvedAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"refunds": out})
}

func (h *Handlers) adminResolveRefund(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var (
		uid    int64
		amount float64
	)
	if err := tx.QueryRow(ctx, `SELECT user_id, amount_toman FROM refund_queue WHERE id=$1 AND status='pending'`, id).Scan(&uid, &amount); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET balance_toman=balance_toman+$1 WHERE id=$2`, amount, uid); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference) VALUES ($1, $2, 'refund', $3)`,
		uid, amount, fmt.Sprintf("refund:%d", id)); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE refund_queue SET status='resolved', resolved_at=now() WHERE id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminRejectRefund(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := h.DB.Exec(r.Context(), `UPDATE refund_queue SET status='rejected', resolved_at=now() WHERE id=$1 AND status='pending'`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// flags
func (h *Handlers) adminListFlags(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, email, flagged_at, flag_reason, balance_toman
		FROM users WHERE flagged_at IS NOT NULL ORDER BY flagged_at DESC LIMIT 200
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID        int64      `json:"id"`
		Email     string     `json:"email"`
		FlaggedAt *time.Time `json:"flagged_at,omitempty"`
		Reason    *string    `json:"flag_reason,omitempty"`
		Balance   float64    `json:"balance_toman"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Email, &r.FlaggedAt, &r.Reason, &r.Balance); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"flags": out})
}

// providers
func (h *Handlers) adminListProviders(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, name, base_url, enabled, priority, last_ok_at, last_err_at, last_err, created_at
		FROM upstream_providers ORDER BY priority, id
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID        int64      `json:"id"`
		Name      string     `json:"name"`
		BaseURL   *string    `json:"base_url,omitempty"`
		Enabled   bool       `json:"enabled"`
		Priority  int        `json:"priority"`
		LastOk    *time.Time `json:"last_ok_at,omitempty"`
		LastErr   *time.Time `json:"last_err_at,omitempty"`
		LastErrM  *string    `json:"last_err,omitempty"`
		CreatedAt time.Time  `json:"created_at"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Name, &r.BaseURL, &r.Enabled, &r.Priority, &r.LastOk, &r.LastErr, &r.LastErrM, &r.CreatedAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"providers": out})
}

type providerBody struct {
	ID       int64  `json:"id,omitempty"`
	Name     string `json:"name"`
	BaseURL  string `json:"base_url"`
	APIKey   string `json:"api_key,omitempty"`
	Priority int    `json:"priority"`
	Enabled  bool   `json:"enabled"`
}

func (h *Handlers) adminUpsertProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	var body providerBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "name required")
		return
	}
	if body.ID > 0 {
		// Update existing. Leave api_key alone if blank.
		if body.APIKey != "" {
			if _, err := h.DB.Exec(r.Context(), `
				UPDATE upstream_providers SET name=$1, base_url=$2, api_key=$3, priority=$4, enabled=$5 WHERE id=$6
			`, body.Name, body.BaseURL, body.APIKey, body.Priority, body.Enabled, body.ID); err != nil {
				writeError(w, http.StatusInternalServerError, "internal", "db")
				return
			}
		} else {
			if _, err := h.DB.Exec(r.Context(), `
				UPDATE upstream_providers SET name=$1, base_url=$2, priority=$3, enabled=$4 WHERE id=$5
			`, body.Name, body.BaseURL, body.Priority, body.Enabled, body.ID); err != nil {
				writeError(w, http.StatusInternalServerError, "internal", "db")
				return
			}
		}
	} else {
		if _, err := h.DB.Exec(r.Context(), `
			INSERT INTO upstream_providers (name, base_url, api_key, priority, enabled) VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (name) DO UPDATE SET base_url=EXCLUDED.base_url, api_key=EXCLUDED.api_key, priority=EXCLUDED.priority, enabled=EXCLUDED.enabled
		`, body.Name, body.BaseURL, body.APIKey, body.Priority, body.Enabled); err != nil {
			writeError(w, http.StatusInternalServerError, "internal", "db")
			return
		}
	}
	h.refreshProviders(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminToggleProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := h.DB.Exec(r.Context(), `UPDATE upstream_providers SET enabled = NOT enabled WHERE id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	h.refreshProviders(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminDeleteProvider(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if _, err := h.DB.Exec(r.Context(), `DELETE FROM upstream_providers WHERE id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	h.refreshProviders(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) refreshProviders(ctx context.Context) {
	rows, err := h.DB.Query(ctx, `SELECT name, base_url, api_key, enabled, priority FROM upstream_providers ORDER BY priority, id`)
	if err != nil {
		return
	}
	defer rows.Close()
	ps := []upstream.Provider{}
	for rows.Next() {
		var p upstream.Provider
		if err := rows.Scan(&p.Name, &p.BaseURL, &p.APIKey, &p.Enabled, &p.Pri); err == nil {
			ps = append(ps, p)
		}
	}
	h.Upstream.SetProviders(ps)
}

// resellers
func (h *Handlers) adminListResellers(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	rows, err := h.DB.Query(r.Context(), `
		SELECT rs.id, rs.slug, rs.brand_name, rs.markup_pct, rs.is_active, u.email, rs.created_at
		FROM resellers rs JOIN users u ON u.id=rs.owner_user_id ORDER BY rs.created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID        int64     `json:"id"`
		Slug      string    `json:"slug"`
		Brand     *string   `json:"brand_name,omitempty"`
		Markup    float64   `json:"markup_pct"`
		Active    bool      `json:"is_active"`
		Email     string    `json:"owner_email"`
		CreatedAt time.Time `json:"created_at"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.ID, &r.Slug, &r.Brand, &r.Markup, &r.Active, &r.Email, &r.CreatedAt); err == nil {
			out = append(out, r)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"resellers": out})
}

type resellerBody struct {
	OwnerEmail string  `json:"owner_email"`
	Slug       string  `json:"slug"`
	Brand      string  `json:"brand_name,omitempty"`
	Markup     float64 `json:"markup_pct"`
}

func (h *Handlers) adminCreateReseller(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	var body resellerBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.OwnerEmail == "" || body.Slug == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "owner_email and slug required")
		return
	}
	var ownerID int64
	if err := h.DB.QueryRow(r.Context(), `
		INSERT INTO users (email, is_active) VALUES (LOWER($1), TRUE)
		ON CONFLICT (email) DO UPDATE SET is_active=TRUE
		RETURNING id
	`, body.OwnerEmail).Scan(&ownerID); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := h.DB.Exec(r.Context(), `
		INSERT INTO resellers (owner_user_id, slug, brand_name, markup_pct) VALUES ($1, $2, NULLIF($3,''), $4)
		ON CONFLICT (slug) DO UPDATE SET brand_name=EXCLUDED.brand_name, markup_pct=EXCLUDED.markup_pct
	`, ownerID, body.Slug, body.Brand, body.Markup); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// admin payments (card-to-card)
func (h *Handlers) adminListPayments(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	status := r.URL.Query().Get("status")
	var rows pgx.Rows
	var err error
	if status != "" {
		rows, err = h.DB.Query(r.Context(), `
			SELECT pr.id, pr.user_id, u.email, pr.amount_toman, pr.reference_number,
			       pr.sender_card, pr.receipt_image, pr.status, pr.admin_note, pr.created_at, pr.resolved_at
			FROM payment_requests pr JOIN users u ON u.id=pr.user_id
			WHERE pr.status=$1 ORDER BY pr.created_at DESC LIMIT 200
		`, status)
	} else {
		rows, err = h.DB.Query(r.Context(), `
			SELECT pr.id, pr.user_id, u.email, pr.amount_toman, pr.reference_number,
			       pr.sender_card, pr.receipt_image, pr.status, pr.admin_note, pr.created_at, pr.resolved_at
			FROM payment_requests pr JOIN users u ON u.id=pr.user_id
			ORDER BY pr.created_at DESC LIMIT 200
		`)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer rows.Close()
	type row struct {
		ID         int64      `json:"id"`
		UserID     int64      `json:"user_id"`
		Email      string     `json:"email"`
		Amount     float64    `json:"amount_toman"`
		Reference  *string    `json:"reference_number,omitempty"`
		SenderCard *string    `json:"sender_card,omitempty"`
		HasImage   bool       `json:"has_image"`
		ImageURL   string     `json:"image_url,omitempty"`
		Status     string     `json:"status"`
		AdminNote  *string    `json:"admin_note,omitempty"`
		CreatedAt  time.Time  `json:"created_at"`
		ResolvedAt *time.Time `json:"resolved_at,omitempty"`
	}
	out := []row{}
	for rows.Next() {
		var ro row
		var img *string
		if err := rows.Scan(&ro.ID, &ro.UserID, &ro.Email, &ro.Amount, &ro.Reference, &ro.SenderCard, &img, &ro.Status, &ro.AdminNote, &ro.CreatedAt, &ro.ResolvedAt); err == nil {
			if img != nil && *img != "" {
				ro.HasImage = true
				ro.ImageURL = "/api/uploads/receipts/" + *img
			}
			out = append(out, ro)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"requests": out})
}

type adminPaymentNoteBody struct {
	Note string `json:"note,omitempty"`
}

func (h *Handlers) adminApprovePayment(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body adminPaymentNoteBody
	_ = json.NewDecoder(r.Body).Decode(&body)

	ctx := r.Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var uid int64
	var amount float64
	if err := tx.QueryRow(ctx, `
		SELECT user_id, amount_toman FROM payment_requests WHERE id=$1 AND status='pending'
	`, id).Scan(&uid, &amount); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "درخواست پیدا نشد یا قبلاً پردازش شده")
		return
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET balance_toman=balance_toman+$1 WHERE id=$2`, amount, uid); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_transactions (user_id, amount_toman, kind, reference)
		VALUES ($1, $2, 'topup', $3)
	`, uid, amount, fmt.Sprintf("card2card:%d", id)); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	if _, err := tx.Exec(ctx, `
		UPDATE payment_requests SET status='approved', admin_note=NULLIF($1,''), resolved_at=now() WHERE id=$2
	`, body.Note, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	// Trigger referral bonus on the FIRST approved top-up of this user.
	// maybeApplyReferralBonus is idempotent: it checks referral_bonus_paid
	// and short-circuits if already credited.
	h.maybeApplyReferralBonus(ctx, tx, uid)
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handlers) adminRejectPayment(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireAdmin(w, r); !ok {
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body adminPaymentNoteBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	if _, err := h.DB.Exec(r.Context(), `
		UPDATE payment_requests SET status='rejected', admin_note=NULLIF($1,''), resolved_at=now()
		WHERE id=$2 AND status='pending'
	`, body.Note, id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "db")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ──────────────────────── async helpers ────────────────────────────

var lowBalanceMu sync.Mutex
var lowBalanceLastFired time.Time

func (h *Handlers) maybeAlertLowBalance(remaining int) {
	if remaining < 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	threshold := int(h.DB.GetSettingFloat(ctx, "low_balance_threshold", 10))
	if remaining >= threshold {
		return
	}
	to := h.DB.GetSettingString(ctx, "operator_alert_email", h.Cfg.SeedAdminEmail)
	if to == "" {
		return
	}
	lowBalanceMu.Lock()
	if time.Since(lowBalanceLastFired) < 1*time.Hour {
		lowBalanceMu.Unlock()
		return
	}
	lowBalanceLastFired = time.Now()
	lowBalanceMu.Unlock()
	sub, html, text, err := email.RenderLowBalance(remaining)
	if err != nil {
		return
	}
	if err := h.Email.Send(ctx, to, sub, html, text); err != nil && !errors.Is(err, email.ErrNotConfigured) {
		log.Printf("low-balance alert: %v", err)
	}
	payload, _ := json.Marshal(map[string]any{"remaining": remaining, "to": to})
	_, _ = h.DB.Exec(ctx, `INSERT INTO operator_alerts (kind, payload) VALUES ('low_balance', $1)`, payload)
}

func (h *Handlers) maybeFlagAbuse(uid int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	minLookups := int(h.DB.GetSettingFloat(ctx, "abuse_min_lookups_to_flag", 20))
	maxRatio := h.DB.GetSettingFloat(ctx, "abuse_max_success_ratio", 0.10)
	var total, succ int
	_ = h.DB.QueryRow(ctx, `SELECT count(*), COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END),0) FROM lookups WHERE user_id=$1`, uid).Scan(&total, &succ)
	if total < minLookups {
		return
	}
	ratio := float64(succ) / float64(total)
	if ratio > maxRatio {
		return
	}
	_, _ = h.DB.Exec(ctx, `
		UPDATE users SET flagged_at=now(), flag_reason=$1
		WHERE id=$2 AND flagged_at IS NULL
	`, fmt.Sprintf("low success ratio: %d/%d = %.2f", succ, total, ratio), uid)
}

// ──────────────────────── helpers ────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]any{"error": code, "message": msg})
}

func looksLikeEmail(s string) bool {
	if len(s) < 3 || len(s) > 254 {
		return false
	}
	at := strings.IndexByte(s, '@')
	if at <= 0 || at == len(s)-1 {
		return false
	}
	if strings.Contains(s, " ") {
		return false
	}
	return strings.Contains(s[at+1:], ".")
}

func randomToken(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func clientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		if i := strings.IndexByte(ip, ','); i >= 0 {
			ip = ip[:i]
		}
		return strings.TrimSpace(ip)
	}
	if ip := r.RemoteAddr; ip != "" {
		if i := strings.LastIndexByte(ip, ':'); i >= 0 {
			return ip[:i]
		}
		return ip
	}
	return ""
}

func generateRefCode() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return strings.ToUpper(base64.RawURLEncoding.EncodeToString(b))[:8]
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func jsonStrSlice(s *string) []string {
	if s == nil {
		return nil
	}
	var out []string
	_ = json.Unmarshal([]byte(*s), &out)
	return out
}

func fmtToman(n float64) string {
	return strconv.FormatFloat(n, 'f', 0, 64)
}
