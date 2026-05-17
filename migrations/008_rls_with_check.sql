-- Migration 008: add WITH CHECK to every write-capable RLS policy.
--
-- 004/007 created policies with only USING(...). For SELECT/UPDATE/DELETE
-- USING filters visible rows, but for INSERT (and the NEW row of UPDATE)
-- Postgres evaluates WITH CHECK — which was absent, so app_user could
-- INSERT/UPDATE a row with someone else's user_id (cross-tenant write).
-- Recreate each policy with a matching WITH CHECK. Idempotent.

-- ── accounts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS accounts_user_isolation ON accounts;
CREATE POLICY accounts_user_isolation ON accounts
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ── transactions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS transactions_user_isolation ON transactions;
CREATE POLICY transactions_user_isolation ON transactions
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ── budgets ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS budgets_user_isolation ON budgets;
CREATE POLICY budgets_user_isolation ON budgets
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ── recurring_transactions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS recurring_user_isolation ON recurring_transactions;
CREATE POLICY recurring_user_isolation ON recurring_transactions
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ── refresh_tokens ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS refresh_tokens_user_isolation ON refresh_tokens;
CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- ── users (self only; no INSERT via app role anyway) ────────────────────────
DROP POLICY IF EXISTS users_self_isolation ON users;
CREATE POLICY users_self_isolation ON users
  FOR ALL TO app_user
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- ── categories: keep split read (system+own) / write (own only) ─────────────
DROP POLICY IF EXISTS categories_read ON categories;
CREATE POLICY categories_read ON categories
  FOR SELECT TO app_user
  USING (user_id IS NULL OR user_id = current_user_id());

DROP POLICY IF EXISTS categories_write ON categories;
CREATE POLICY categories_write ON categories
  FOR ALL TO app_user
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());
