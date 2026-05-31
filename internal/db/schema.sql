-- TeleYab schema. All statements are idempotent so this file doubles
-- as both initial migration and ongoing schema-of-truth.

-- Users own a Toman wallet balance and (eventually) admin role.
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    balance_toman NUMERIC(20, 2) NOT NULL DEFAULT 0,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time login tokens (magic links).
-- Token is stored as sha256 hex; raw token only lives in the email URL.
CREATE TABLE IF NOT EXISTS magic_links (
    id          BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    request_ip  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS magic_links_email_idx ON magic_links(email);
CREATE INDEX IF NOT EXISTS magic_links_expires_idx ON magic_links(expires_at);

-- Wallet ledger — source of truth for balance. users.balance_toman is the
-- materialised sum maintained inside the same transaction.
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_toman NUMERIC(20, 2) NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('topup', 'charge', 'refund', 'adjustment')),
    reference    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON wallet_transactions(user_id, created_at DESC);

-- Every lookup we make against the upstream API. Failures cost nothing but
-- we still record them so the user sees their history.
CREATE TABLE IF NOT EXISTS lookups (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query           TEXT NOT NULL,
    success         BOOLEAN NOT NULL,
    country         TEXT,
    numbers         JSONB,            -- ["+31612345678", ...]
    additional_data JSONB,            -- whatever upstream returns
    error           TEXT,
    cost_toman      NUMERIC(20, 2) NOT NULL DEFAULT 0,
    upstream_tokens_remaining INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lookups_user_idx ON lookups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lookups_query_idx ON lookups(lower(query));

-- Legacy: PSP payment intents (removed — superseded by payment_requests).
-- Table kept so existing DBs don't lose historical rows.
CREATE TABLE IF NOT EXISTS payment_intents (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    authority      TEXT UNIQUE,
    amount_toman   NUMERIC(20, 2) NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    ref_id         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payment_intents_user_idx ON payment_intents(user_id, created_at DESC);

-- Runtime-tunable key/value settings.
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Server-side sessions. We use a random token in the cookie; the row holds
-- user_id + expiry. This is sturdier than signed-payload cookies for a
-- per-lookup-billed product because we can revoke instantly if abuse shows up.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip         INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- Auth: password-based login + one-time email verification.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- v1.5 / v2 / v2.5 / v3 additions ─────────────────────────────────────────

-- Per-user referral codes + ledger of who referred whom.
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- v3: track which upstream provider served a lookup.
ALTER TABLE lookups ADD COLUMN IF NOT EXISTS provider TEXT;
-- v1.5: lookup cache marker. If a row was served from cache, original_lookup_id
-- points at the paid row and cost is 0.
ALTER TABLE lookups ADD COLUMN IF NOT EXISTS served_from_cache BIGINT REFERENCES lookups(id);

-- v1.5/v2/v2.5/v3: extra settings keys are written here too. Already exists.

-- Operator notifications (low-balance webhook history).
CREATE TABLE IF NOT EXISTS operator_alerts (
    id           BIGSERIAL PRIMARY KEY,
    kind         TEXT NOT NULL,
    payload      JSONB,
    sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operator_alerts_kind_idx ON operator_alerts(kind, sent_at DESC);

-- Refund queue for ambiguous charges (upstream success but we crashed before commit).
CREATE TABLE IF NOT EXISTS refund_queue (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lookup_id   BIGINT REFERENCES lookups(id),
    amount_toman NUMERIC(20, 2) NOT NULL,
    reason      TEXT,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','rejected')),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS refund_queue_status_idx ON refund_queue(status, created_at DESC);

-- v2.5: public API keys (per user).
CREATE TABLE IF NOT EXISTS api_keys (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix   TEXT NOT NULL,
    key_hash     TEXT UNIQUE NOT NULL,
    name         TEXT,
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id, created_at DESC);

-- v2.5: bulk-import batches.
CREATE TABLE IF NOT EXISTS lookup_batches (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT,
    total        INTEGER NOT NULL DEFAULT 0,
    completed    INTEGER NOT NULL DEFAULT 0,
    successful   INTEGER NOT NULL DEFAULT 0,
    cost_toman   NUMERIC(20, 2) NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','cancelled','failed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lookup_batches_user_idx ON lookup_batches(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lookup_batch_items (
    id         BIGSERIAL PRIMARY KEY,
    batch_id   BIGINT NOT NULL REFERENCES lookup_batches(id) ON DELETE CASCADE,
    query      TEXT NOT NULL,
    lookup_id  BIGINT REFERENCES lookups(id),
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','skipped','error')),
    error      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lookup_batch_items_batch_idx ON lookup_batch_items(batch_id, id);

-- v3: reseller program (white-label scaffolding).
CREATE TABLE IF NOT EXISTS resellers (
    id            BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug          TEXT UNIQUE NOT NULL,
    brand_name    TEXT,
    markup_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- v3: upstream provider config + per-provider state (priority, enabled, last_error).
CREATE TABLE IF NOT EXISTS upstream_providers (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    base_url    TEXT,
    api_key     TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    priority    INTEGER NOT NULL DEFAULT 100,
    last_ok_at  TIMESTAMPTZ,
    last_err_at TIMESTAMPTZ,
    last_err    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Card-to-card (کارت به کارت) manual top-up requests.
-- User uploads a receipt image + transfer reference; admin approves/rejects.
CREATE TABLE IF NOT EXISTS payment_requests (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_toman     NUMERIC(20, 2) NOT NULL,
    reference_number TEXT,
    sender_card      TEXT,
    receipt_image    TEXT,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    admin_note       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payment_requests_user_idx ON payment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON payment_requests(status, created_at DESC);

-- Per-user / per-window quota counters (anti-burst on top of wallet).
-- We just query lookups by created_at; no separate counter table required.

-- Rate-limit hit log (optional, for ops to spot abusers).
CREATE TABLE IF NOT EXISTS rate_limit_hits (
    id         BIGSERIAL PRIMARY KEY,
    scope      TEXT NOT NULL,
    key        TEXT NOT NULL,
    path       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_idx ON rate_limit_hits(scope, key, created_at DESC);

-- Password reset tokens. Kept separate from magic_links for auditability —
-- a reset token grants password-change power, an email-verify token grants
-- account-activation. Same shape, different lifecycle, different blast radius.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    request_ip  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prt_user_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS prt_expires_idx ON password_reset_tokens(expires_at);
