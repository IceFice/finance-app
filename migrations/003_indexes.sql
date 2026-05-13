-- Users
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;

-- Accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_user_active ON accounts(user_id) WHERE deleted_at IS NULL AND is_active = true;

-- Categories
CREATE INDEX idx_categories_user_id ON categories(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_categories_system ON categories(type, sort_order) WHERE is_system = true;

-- Transactions (covering indexes for common queries)
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_list_covering ON transactions(user_id, date DESC, created_at DESC)
  INCLUDE (account_id, category_id, amount, amount_base, currency, type, description, merchant)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_category ON transactions(category_id, date DESC)
  WHERE category_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_transactions_user_category_date ON transactions(user_id, category_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_debit_budget
  ON transactions(user_id, category_id, date)
  INCLUDE (amount_base)
  WHERE deleted_at IS NULL AND type = 'debit';

CREATE INDEX idx_transactions_report_monthly
  ON transactions(user_id, date DESC, category_id)
  INCLUDE (amount_base, type)
  WHERE deleted_at IS NULL AND type != 'transfer';

-- Budgets
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_user_active ON budgets(user_id) WHERE is_active = true;

-- Recurring
CREATE INDEX idx_recurring_next_due_active ON recurring_transactions(next_due_date)
  WHERE is_active = true;
