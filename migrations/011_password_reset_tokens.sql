-- 011_password_reset_tokens.sql
-- Tokens for "Forgot password" flow. We never store the raw token — only a
-- SHA-256 hash — so a database leak doesn't grant an attacker the ability
-- to reset arbitrary accounts.
--
-- RLS deliberately NOT enabled: this table is touched only by /auth/* before
-- the user is authenticated, so there's no current_user_id to scope by.
-- Privacy is provided by:
--   - the token itself (40 random bytes via crypto.randomBytes)
--   - one-time use (used_at)
--   - 30-minute TTL (expires_at)
--   - SELECT WHERE token_hash = $1 (constant-time-equivalent lookup)

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT         NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- IP of the requester, kept for audit purposes only.
  request_ip  TEXT
);

-- Lookup by hash. Tokens are removed by retention sweep + ON DELETE CASCADE,
-- so this index stays small.
CREATE INDEX IF NOT EXISTS idx_password_reset_active
  ON password_reset_tokens(token_hash) WHERE used_at IS NULL;

-- Per-user lookup for rate-limit / "throw away old unused tokens".
CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON password_reset_tokens(user_id, created_at DESC);
