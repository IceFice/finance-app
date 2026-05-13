-- App role for RLS
DO $$ BEGIN
  CREATE ROLE app_user;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Helper function to get current user from session
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY accounts_user_isolation ON accounts
  FOR ALL TO app_user USING (user_id = current_user_id());

-- Transactions policies
CREATE POLICY transactions_user_isolation ON transactions
  FOR ALL TO app_user USING (user_id = current_user_id());

-- Budgets policies
CREATE POLICY budgets_user_isolation ON budgets
  FOR ALL TO app_user USING (user_id = current_user_id());

-- Recurring transactions policies
CREATE POLICY recurring_user_isolation ON recurring_transactions
  FOR ALL TO app_user USING (user_id = current_user_id());

-- Refresh tokens policies
CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens
  FOR ALL TO app_user USING (user_id = current_user_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
