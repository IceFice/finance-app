-- 010_savings_goals.sql
-- Personal savings goals: a named target sum to reach by an optional deadline.
-- Progress is computed from the linked source account's current balance when
-- one is set, otherwise from the row's `current_amount` (manual tracker).

CREATE TABLE IF NOT EXISTS savings_goals (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(100)    NOT NULL,
  target_amount       NUMERIC(15,2)   NOT NULL CHECK (target_amount > 0),
  current_amount      NUMERIC(15,2)   NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  currency            CHAR(3)         NOT NULL DEFAULT 'RUB',
  deadline            DATE,
  source_account_id   UUID            REFERENCES accounts(id) ON DELETE SET NULL,
  color               VARCHAR(7),
  icon                VARCHAR(50),
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_active
  ON savings_goals(user_id, is_active) WHERE is_active = TRUE;

-- updated_at trigger (function defined in 005_triggers.sql).
DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS — same pattern as accounts/budgets (008_rls_with_check.sql).
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS savings_goals_user_isolation ON savings_goals;
CREATE POLICY savings_goals_user_isolation ON savings_goals
  FOR ALL TO app_user
  USING      (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON savings_goals TO app_user;
