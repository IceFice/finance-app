-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_recurring_updated_at
  BEFORE UPDATE ON recurring_transactions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Update account balance on transaction change
CREATE OR REPLACE FUNCTION fn_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE accounts SET balance = balance +
      CASE NEW.type WHEN 'credit' THEN NEW.amount ELSE -NEW.amount END
    WHERE id = NEW.account_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old effect if it was active
    IF OLD.deleted_at IS NULL THEN
      UPDATE accounts SET balance = balance -
        CASE OLD.type WHEN 'credit' THEN OLD.amount ELSE -OLD.amount END
      WHERE id = OLD.account_id;
    END IF;
    -- Apply new effect if now active
    IF NEW.deleted_at IS NULL THEN
      UPDATE accounts SET balance = balance +
        CASE NEW.type WHEN 'credit' THEN NEW.amount ELSE -NEW.amount END
      WHERE id = NEW.account_id;
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE accounts SET balance = balance -
      CASE OLD.type WHEN 'credit' THEN OLD.amount ELSE -OLD.amount END
    WHERE id = OLD.account_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_transactions_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_update_account_balance();
