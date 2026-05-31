# TeleYab — Plan & Roadmap

> RTL lookup service: customer types a Telegram `@username` or
> numeric ID, we return the phone number behind it (plus, when available,
> name, email, previous usernames, birthday, country). Wallet billing in
> Toman, **email + password** auth (magic-link only for email verification +
> password reset), top-ups via **card-to-card with admin approval**. Public
> surface is positioned as TeleYab's own database. Upstream provider
> integration is operator-only — never mentioned in user-facing copy.

---

## 1. What this is (in one sentence)

A RTL proxy storefront for a username→phone-number lookup API, with wallet billing, history, and an admin/operations dashboard.

## 2. What this is NOT (deliberate non-goals)

- **Not an OSINT toolkit.** Single API, single feature. Don't add reverse-lookups, bulk imports, scraping helpers, or "discover similar users" in v1.
- **Not a SaaS with seats.** One user = one wallet. No teams.
- **Not bilingual.** RTL-first; everything is fa-IR.
- **Not a generic phone-info service.** We're a thin storefront over one upstream API. If the upstream goes dark, the product goes dark.

## 3. Architecture

**Repo:** `/home/website-dev/teleyab` — one monorepo, two services at runtime (web + api). Same shape as 1xAi / hedhed / aicontentcreator.

| Piece | Tech                                                   | Port |
| ----- | ------------------------------------------------------ | ---- |
| Web   | Next.js 16, React 19, Tailwind v4, TypeScript          | 4102 |
| API   | Go 1.23, chi, pgx                                      | 8084 |
| DB    | Postgres 16 (docker)                                   | 5436 |
| Auth  | Email + password; magic-link (Resend) for verify + reset | —  |
| Pay   | Card-to-card with admin approval (Toman)               | —    |
| SMS   | (not used — auth is email only)                        | —    |

```
┌────────────────────────────────────────────────────────────────────┐
│                            TeleYab                                  │
│                                                                     │
│   web/   ── Next.js dashboard (RTL)                         │
│   internal/handlers     ── HTTP API (chi)                           │
│   internal/upstream     ── data-source HTTP client                  │
│   internal/{db,session,email,config}                                │
│                                                                     │
└──────────────────┬──────────────────────────────┬───────────────────┘
                   │                              │
                   │ GET /lookup, /balance        │ Browser
                   ▼                              ▼
       upstream lookup provider           end user
            (1 token per success)
```

## 4. Data model (lives in `internal/db/schema.sql`)

```
users                 id, email, role[user|admin], balance_toman,
                      is_active, last_login_at, ...
magic_links           email, token_hash, expires_at, consumed_at
sessions              token_hash, user_id, expires_at  (table-backed, instant revoke)
wallet_transactions   user_id, amount_toman, kind[topup|charge|refund|adjust]
lookups               user_id, query, success, country, numbers[],
                      additional_data, cost_toman,
                      upstream_tokens_remaining
payment_requests      user_id, amount_toman, reference_number,
                      sender_card, receipt_image, status, admin_note
settings              price_per_lookup_toman, min_topup_toman, max_topup_toman,
                      referral_bonus_toman, bank_card_number, ...
```

## 5. Pricing rules (non-negotiable)

1. **Failed lookups cost zero.** Matches upstream — they don't charge us, we don't charge the customer.
2. **Pre-flight balance check.** If wallet < `price_per_lookup_toman`, we refuse the lookup before calling upstream. Broke users never burn an upstream token.
3. **Charge + result-insert are atomic.** Single DB transaction wraps the debit, the wallet ledger row, and the lookup row.
4. **Pricing knob is in DB, not code.** `settings.price_per_lookup_toman` — admins change it without redeploying.

## 6. Upstream contract

The upstream lookup provider speaks a small HTTP API:

```
GET /lookup?key=…&query=@username_or_userid    → 1 token on success, FREE on failure
GET /balance?key=…                              → tokens_remaining
```

Response shapes:

```json
{ "success": true,  "query": "...", "numbers": ["+98..."], "country": "...",
  "tokens_remaining": N, "additional_data": {...} }
{ "success": false, "error": "No number found", "tokens_remaining": N }
```

The provider base URL + API key are configured per environment in
`UPSTREAM_BASE_URL` and `UPSTREAM_API_KEY`. The lookup pre-flight balance
check + atomic charge ensure the wallet is never debited when the
upstream call fails or times out.

## 7. Auth (email + password, magic-link for verify + reset)

- POST `/api/auth/register {email, password, ref_code?}` → bcrypt-hash the
  password, insert user, issue an email-verification token (24h, hashed at
  rest, single-use) sent via Resend.
- POST `/api/auth/verify-email {token}` → marks `email_verified_at`, consumes
  the token. On first login after verification, `users.referred_by` is set
  from the `teleyab_ref` cookie if one was deposited at signup.
- POST `/api/auth/login {email, password}` → bcrypt-compare, issue session
  cookie. Returns 403 if email not verified or account banned.
- POST `/api/auth/forgot-password {email}` → always returns 200 (anti-
  enumeration). Issues a 1h reset token if the user exists + is verified +
  not banned; rate-limited to 3 unexpired tokens per user.
- POST `/api/auth/reset-password {token, password}` → updates the bcrypt
  hash, force-logs-out every session for that user, consumes the token.
- Server-side `sessions` row — can revoke instantly by deleting it.
- Tokens are hashed at rest; only the raw value ever exists in the email URL.

---

## 8. Roadmap

### v1 — MVP (DONE)

- [x] Postgres + Docker
- [x] Go API: config, db (embedded schema), session, email, upstream client, handlers
- [x] Magic-link auth (Resend in prod, stdout log in dev)
- [x] `/api/lookup` with balance gate + atomic charge
- [x] `/api/topup/request` + admin approval flow (card-to-card with receipt upload)
- [x] Next.js pages: `/`, `/login`, `/verify`, `/lookup`, `/wallet`, `/topup`, `/admin`
- [x] Admin: stats, upstream-token balance check
- [x] End-to-end smoke-tested (auth, balance gate, transaction integrity)

### v1.5 — Polish (~1 weekend)

- [ ] Admin settings page (edit `price_per_lookup_toman`, `min_topup_toman`, `max_topup_toman` from UI)
- [ ] User-facing pricing page (just renders current setting in fa-IR)
- [ ] Webhook to operator email when upstream `tokens_remaining < 10`
- [ ] Lookup-result caching: identical query in last N days → serve from `lookups` table for free (configurable; opt-in per project)
- [ ] Email receipts after successful top-ups
- [ ] Lookup retry button when upstream returns 522/timeout (does NOT charge)

### v2 — Operational hardening (~1-2 weekends)

- [ ] Rate limiting per IP and per user (chi middleware)
- [ ] Abuse heuristics: flag user when ratio of queries→matches is suspiciously low (probable scraper)
- [ ] Refund queue for failed charges (cases where upstream said success but we crashed before commit)
- [ ] Admin: ban / unban users; force-logout (delete all sessions for a user)
- [ ] Admin: view per-user lookup history + financial timeline
- [ ] Per-user lookup quota (anti-burst — e.g. 60/hour even if wallet allows it)

### v2.5 — Distribution & growth

- [ ] RTL landing page with examples (currently a minimal placeholder)
- [ ] Referral codes (give 5,000 Toman, get 5,000 Toman)
- [ ] Bulk-import flow (CSV of usernames → paid batch lookup) — separate workflow with progress UI; same atomic-charge rules per row
- [ ] Public-API key for paying customers who want to integrate from their own apps

### v3 — Optional / risky

- [ ] Multi-provider fallback already wired in `internal/upstream`; expose admin UI for swapping providers without redeploy.
- [ ] White-label / reseller program (resellers table + nested wallets already in place)

### Deferred (deliberate)

- SMS auth — adds Kavenegar cost for zero security benefit over email magic-link for this product
- Phone-app — web works fine on mobile
- English/global SaaS variant — that's a different product

---

## 9. Honest tradeoff flags

**1. Single point of failure.** The upstream data source is the whole
product. If it shuts down, raises prices, or blocks our key, we're done.
The multi-provider router in `internal/upstream` walks a priority-ordered
list of providers, so the long-term hedge is to keep more than one
provider live in the `upstream_providers` table.

**2. Network access can be region-restricted.** Some upstream providers
serve only from specific origins. The API server should be deployed on a
hosting provider whose IPs the upstream accepts; a CDN/edge can sit in
front for users regardless.

**3. Privacy/legal surface is large.** "Username → phone number" is sensitive. We are explicitly **passing through** what the upstream returns; we add no data. Still — we should publish a basic ToS and ensure customers acknowledge they're responsible for what they look up. Don't store more than we need; the `lookups` table already keeps only what the user paid to retrieve.

**4. Wallet model means held customer funds.** Customers top up before they spend. That's a regulatory question if it grows: we owe them the unspent balance. Keep the `wallet_transactions` ledger clean; never let `users.balance_toman` drift from `SUM(amount_toman)`.

---

## 10. First-run

```bash
cd /home/website-dev/teleyab
docker compose up -d              # postgres on 127.0.0.1:5436
cp .env.example .env              # fill in UPSTREAM_API_KEY (already in .env.example for dev),
                                  # RESEND_API_KEY, ZARINPAL_MERCHANT_ID, SEED_ADMIN_EMAIL

go mod tidy
go build -o bin/teleyab-api ./cmd/server
./bin/teleyab-api                 # API on :8084

cd web
npm install
npm run dev                       # dashboard on :4102
```

Open <http://localhost:4102>. In dev mode (no `RESEND_API_KEY`) the magic
link prints to the API log — copy it from there to sign in.

## 11. Repo layout

```
teleyab/
├── PLAN.md                          ← this file
├── README.md
├── docker-compose.yml
├── .env.example
├── go.mod / go.sum
├── cmd/server/main.go
├── internal/
│   ├── config/                      ← env loading + first-run defaults
│   ├── db/                          ← schema.sql embedded + pgxpool
│   ├── session/                     ← table-backed sessions
│   ├── email/                       ← Resend wrapper (verify + reset templates)
│   ├── upstream/                    ← multi-provider lookup HTTP client
│   └── handlers/                    ← chi routes
└── web/
    ├── app/
    │   ├── page.tsx                 ← landing (RTL)
    │   ├── login/                   ← email + password
    │   ├── verify/                  ← email-verification token consumer
    │   ├── forgot-password/         ← request a reset link
    │   ├── reset-password/          ← new-password form
    │   ├── lookup/                  ← chat-style query composer (auth)
    │   ├── batch/                   ← bulk upload (auth)
    │   ├── keys/                    ← Bearer-token issuance (auth)
    │   ├── wallet/                  ← balance + history (auth)
    │   ├── topup/                   ← card-to-card request + receipt (auth)
    │   ├── referral/                ← invite + earnings (auth)
    │   └── admin/                   ← operator UI (admin role)
    └── components/
        └── nav.tsx, chat.tsx, schema-ld.tsx, ref-capture.tsx, …
```

## 12. Operational notes

- **Dev mode signal:** if `RESEND_API_KEY` is empty, the verification /
  reset email body prints to the API log — don't try to debug "no email
  arriving" before checking the log.
- **Postgres port 5436** was picked because 5432–5435 are commonly taken
  by other projects on a developer machine.
- **Upstream tokens are paid resources.** Every successful `/lookup`
  consumes one. Use the failure-path (random usernames) to exercise the
  code path during development; spend tokens deliberately, only when
  validating a successful response shape end-to-end.
