-- 009_default_currency_rub.sql
-- Switch column DEFAULTs from 'USD' to 'RUB' so any future INSERT that omits
-- `currency` lands in rubles by default. Existing rows are NOT touched —
-- legacy USD/EUR rows keep their currency; the UI just no longer offers them.
-- Idempotent: ALTER ... SET DEFAULT can run repeatedly.

ALTER TABLE users                  ALTER COLUMN default_currency SET DEFAULT 'RUB';
ALTER TABLE accounts               ALTER COLUMN currency         SET DEFAULT 'RUB';
ALTER TABLE transactions           ALTER COLUMN currency         SET DEFAULT 'RUB';
ALTER TABLE budgets                ALTER COLUMN currency         SET DEFAULT 'RUB';
ALTER TABLE recurring_transactions ALTER COLUMN currency         SET DEFAULT 'RUB';
