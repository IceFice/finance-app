-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ENUM types
CREATE TYPE account_type AS ENUM ('checking','savings','credit_card','cash','investment','loan');
CREATE TYPE transaction_type AS ENUM ('debit','credit','transfer');
CREATE TYPE category_type AS ENUM ('income','expense');
CREATE TYPE budget_period AS ENUM ('weekly','monthly','yearly');
CREATE TYPE recurrence_frequency AS ENUM ('daily','weekly','biweekly','monthly','quarterly','yearly');
