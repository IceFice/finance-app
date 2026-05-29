-- 012_refresh_token_sessions.sql
-- Turn refresh_tokens into session-aware records and enable refresh-token
-- reuse (theft) detection.
--
--  family_id   — groups every token rotated from a single login. On login we
--                start a new family; each /refresh revokes the old token and
--                issues a new one in the SAME family. If a REVOKED token is
--                ever presented again (reuse), we revoke the whole family —
--                the classic OAuth refresh-token rotation defence.
--  user_agent  — raw UA string of the device that created the session.
--  ip          — requester IP (audit + sessions UI).
--  last_used_at— bumped on every successful refresh (sessions UI "active …").

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id    UUID;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent   TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip           TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Backfill: each existing token is its own family so legacy sessions keep
-- working and can be listed/revoked individually.
UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL;

ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;

-- Family lookups happen on every refresh + reuse-detection sweep.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
-- Sessions list: "active sessions for this user".
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
