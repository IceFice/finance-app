# GitHub Secrets & Variables Setup Guide

Configure these in: **Settings → Secrets and variables → Actions**

---

## Repository Secrets

> Settings → Secrets and variables → Actions → **Secrets**

| Secret name | Description | Example |
|-------------|-------------|---------|
| `STAGING_HOST` | Staging server IP or hostname | `staging.example.com` |
| `STAGING_USER` | SSH username | `deploy` |
| `STAGING_SSH_KEY` | SSH private key (full content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `STAGING_DEPLOY_PATH` | Absolute path on staging server | `/opt/finance-app` |
| `PROD_HOST` | Production server IP or hostname | `prod.example.com` |
| `PROD_USER` | SSH username | `deploy` |
| `PROD_SSH_KEY` | SSH private key (full content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROD_DEPLOY_PATH` | Absolute path on production server | `/opt/finance-app` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | `https://hooks.slack.com/services/...` |

> **Note:** `GITHUB_TOKEN` is provided automatically — do NOT add it manually.

---

## Repository Variables

> Settings → Secrets and variables → Actions → **Variables**

| Variable name | Description | Example |
|---------------|-------------|---------|
| `STAGING_URL` | Public staging URL (for environment link) | `https://staging.example.com` |
| `PROD_URL` | Public production URL | `https://app.example.com` |
| `PROD_HEALTH_URL` | Internal health URL on prod server | `http://localhost:4000` |

---

## Environment Configuration

> Settings → **Environments**

### `staging` environment
- No required reviewers (auto-deploy on develop)
- Add environment variable: `STAGING_URL`

### `production` environment
- ✅ **Required reviewers** — add at least 1 person who must approve before deploy runs
- ✅ **Deployment branches** — restrict to `main` branch only
- Add environment variable: `PROD_URL`

---

## Server Setup (one-time)

On each server (staging + production), run as root:

```bash
# 1. Create deploy user
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# 2. Add your CI public key to authorized_keys
mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAA..." >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# 3. Create deploy directory
mkdir -p /opt/finance-app
chown deploy:deploy /opt/finance-app

# 4. Copy docker-compose.yml to the server
# scp docker-compose.yml deploy@server:/opt/finance-app/

# 5. Create .env file on server (NEVER commit this)
cat > /opt/finance-app/.env << 'EOF'
DATABASE_URL=postgresql://finance_user:STRONG_PASSWORD@postgres:5432/finance_db
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=<generate with: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-domain.com
BCRYPT_ROUNDS=12
EOF
chmod 600 /opt/finance-app/.env
```

## Generate SSH key pair for CI

```bash
# Generate a dedicated key (no passphrase for automated CI)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_ci -N ""

# Public key → add to server authorized_keys
cat ~/.ssh/deploy_ci.pub

# Private key → add to GitHub Secret (STAGING_SSH_KEY or PROD_SSH_KEY)
cat ~/.ssh/deploy_ci
```

---

## Branch Protection Rules

> Settings → Branches → Add rule for `main` and `develop`

### `main` branch
- ✅ Require a pull request before merging
- ✅ Require status checks to pass:
  - `Lint · Backend`
  - `Lint · Frontend`
  - `Test · Unit (Vitest)`
  - `Test · Integration (Postgres 16)`
  - `Test · E2E (Playwright)`
  - `Build · Docker → ghcr.io`
- ✅ Require branches to be up to date
- ✅ Restrict who can push (only admins)

### `develop` branch
- ✅ Require a pull request before merging
- ✅ Require status checks:
  - `Lint · Backend`
  - `Lint · Frontend`
  - `Test · Unit (Vitest)`
  - `Test · Integration (Postgres 16)`
