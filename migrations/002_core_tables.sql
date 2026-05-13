-- USERS
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) NOT NULL,
  password_hash       TEXT NOT NULL,
  full_name           VARCHAR(100),
  avatar_url          TEXT,
  default_currency    CHAR(3) NOT NULL DEFAULT 'USD',
  timezone            VARCHAR(50) NOT NULL DEFAULT 'UTC',
  email_verified_at   TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT uq_users_email UNIQUE (email)
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACCOUNTS
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        account_type NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  color       VARCHAR(7),
  icon        VARCHAR(50),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- CATEGORIES
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  type        category_type NOT NULL,
  color       VARCHAR(7),
  icon        VARCHAR(50),
  is_system   BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECURRING TRANSACTIONS
CREATE TABLE recurring_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount          NUMERIC(15,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  type            transaction_type NOT NULL,
  description     TEXT,
  merchant        VARCHAR(255),
  frequency       recurrence_frequency NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  next_due_date   DATE NOT NULL,
  last_applied_at TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  transfer_pair_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  recurring_id     UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  amount           NUMERIC(15,2) NOT NULL,
  amount_base      NUMERIC(15,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  exchange_rate    NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  type             transaction_type NOT NULL,
  description      TEXT,
  merchant         VARCHAR(255),
  date             DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- BUDGETS
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  amount      NUMERIC(15,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  period      budget_period NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
