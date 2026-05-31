// Package session is a table-backed session store. The cookie carries an
// opaque random token; the row in `sessions` holds user_id, expiry, and IP
// metadata. Compared to signed-payload cookies we get instant revocation,
// which matters for a paid product (kick abusive users without rotating keys).
package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	cookieName = "teleyab_sess"
	ttl        = 7 * 24 * time.Hour
)

var ErrNoSession = errors.New("no session")

type Manager struct {
	Pool   *pgxpool.Pool
	Secure bool
}

func New(pool *pgxpool.Pool, secure bool) *Manager {
	return &Manager{Pool: pool, Secure: secure}
}

// Issue creates a server-side session for the given user, writes the cookie,
// and returns the raw token (only useful for tests).
func (m *Manager) Issue(ctx context.Context, w http.ResponseWriter, r *http.Request, userID int64) (string, error) {
	token, err := randomToken(32)
	if err != nil {
		return "", err
	}
	hash := hashToken(token)
	ua := r.UserAgent()
	if len(ua) > 256 {
		ua = ua[:256]
	}
	ip := clientIP(r)
	expires := time.Now().Add(ttl)

	_, err = m.Pool.Exec(ctx, `
		INSERT INTO sessions (token_hash, user_id, user_agent, ip, expires_at)
		VALUES ($1, $2, $3, NULLIF($4,'')::inet, $5)
	`, hash, userID, ua, ip, expires)
	if err != nil {
		return "", err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   m.Secure,
		Expires:  expires,
	})
	return token, nil
}

// UserID looks up the session row for the cookie and returns user_id.
// Returns ErrNoSession if missing or expired.
func (m *Manager) UserID(ctx context.Context, r *http.Request) (int64, error) {
	c, err := r.Cookie(cookieName)
	if err != nil || c.Value == "" {
		return 0, ErrNoSession
	}
	var uid int64
	err = m.Pool.QueryRow(ctx, `
		SELECT user_id FROM sessions
		WHERE token_hash = $1 AND expires_at > now()
	`, hashToken(c.Value)).Scan(&uid)
	if err != nil {
		return 0, ErrNoSession
	}
	return uid, nil
}

// Clear deletes the session row and expires the cookie.
func (m *Manager) Clear(ctx context.Context, w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(cookieName); err == nil && c.Value != "" {
		_, _ = m.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash=$1`, hashToken(c.Value))
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   m.Secure,
		SameSite: http.SameSiteLaxMode,
	})
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
	host := r.RemoteAddr
	if h, _, err := net.SplitHostPort(host); err == nil {
		return h
	}
	return host
}
