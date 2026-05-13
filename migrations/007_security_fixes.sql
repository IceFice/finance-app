-- Migration 007: Security hardening
-- Fixes: users table RLS, missing role grant, categories isolation

-- ── 1. Allow the application DB user to switch to app_user role ──────────────
-- Without this, `SET LOCAL ROLE app_user` in withUserContext() fails.
-- Grants to the CURRENT user (whoever runs this migration = the DATABASE_URL user).
-- This means: run this migration as the same user your app uses to connect.
DO $$
BEGIN
  EXECUTE format('GRANT app_user TO %I', current_user);
END
$$;

-- ── 2. Enable RLS on users table ─────────────────────────────────────────────
-- Without this, app_user can SELECT all users in the system.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY users_self_isolation ON users
  FOR ALL TO app_user
  USING (id = current_user_id());

-- ── 3. Tighten categories: system categories readable by all, custom only by owner ──
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

-- System categories (user_id IS NULL) are readable by everyone
-- Custom categories are only accessible by their owner
CREATE POLICY categories_read ON categories
  FOR SELECT TO app_user
  USING (user_id IS NULL OR user_id = current_user_id());

CREATE POLICY categories_write ON categories
  FOR ALL TO app_user
  USING (user_id = current_user_id());

-- ── 4. Revoke over-broad privileges, re-grant only what's needed ──────────────
-- The previous GRANT gave app_user rights to ALL tables including sensitive ones.
-- Revoke and re-grant per-table.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_transactions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO app_user;
GRANT SELECT, UPDATE ON users TO app_user;              -- no INSERT/DELETE via app role
GRANT SELECT ON categories TO app_user;                 -- read categories
GRANT INSERT, UPDATE, DELETE ON categories TO app_user; -- write own categories (RLS enforces owner)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
