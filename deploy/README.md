# Production Deployment — VPS Runbook

Target: **147.45.219.215** · Ubuntu 24.04 · 1 vCPU / 2 GB · single-server stack.

```
                 ┌─────────────────────────────────────────────┐
  Internet ──▶ 80/443 ─▶  nginx (frontend image)               │
                 │          ├─ serves React SPA (static)        │
                 │          └─ proxies /api  ─▶ backend:4000     │
                 │                                  │            │
                 │   backend (ghcr image) ──┬─ postgres:5432     │
                 │                           └─ redis:6379       │
                 │   (postgres / redis: internal bridge only)    │
                 └─────────────────────────────────────────────┘
```

Everything runs via `docker-compose.prod.yml`. Images are built & pushed to
GHCR by **CI Pipeline** (backend + frontend). **Deploy · Production** SSHes in
and rolls the stack.

---

## 1. DNS (do this first for SSL)

Create an **A record**: `your-domain.com → 147.45.219.215`. Wait for
propagation (`dig +short your-domain.com` returns the IP). HTTP works without
DNS; HTTPS (Let's Encrypt) requires it.

## 2. One-time server bootstrap

```bash
ssh root@147.45.219.215
curl -fsSL https://raw.githubusercontent.com/IceFice/finance-app/main/deploy/server-setup.sh | bash
```

This installs Docker + compose, a 2 GB swapfile, ufw (22/80/443), clones the
repo to `/opt/finance-app`, and creates `/opt/finance-app/.env` from the
template.

Then fill in real secrets:

```bash
nano /opt/finance-app/.env          # DB password, JWT secrets, DOMAIN, FRONTEND_URL
# generate a JWT secret:
docker run --rm node:20-alpine node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Log in to GHCR so images can be pulled (use a PAT with `read:packages`):

```bash
echo <GHCR_PAT> | docker login ghcr.io -u IceFice --password-stdin
```

## 3. First deploy (manual)

```bash
cd /opt/finance-app
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -sf http://localhost/health && echo OK
```

> Schema: all 7 files in `migrations/` run automatically on the **first**
> Postgres start (empty data volume) via `/docker-entrypoint-initdb.d`.

Open `http://147.45.219.215` — the app should load.

## 4. Enable HTTPS (after DNS is live)

```bash
cd /opt/finance-app
bash deploy/enable-ssl.sh your-domain.com you@example.com
# then point the app at the https origin:
sed -i 's#^FRONTEND_URL=.*#FRONTEND_URL=https://your-domain.com#' .env
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

`enable-ssl.sh` obtains the certificate (webroot), swaps nginx to
`app.ssl.conf`, reloads, and installs a daily renewal cron.

## 5. Enable automated CD

In GitHub → repo **Settings**:

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Value |
|--------|-------|
| `PROD_HOST` | `147.45.219.215` |
| `PROD_USER` | `root` (or a deploy user) |
| `PROD_SSH_KEY` | private key whose public key is in the server's `~/.ssh/authorized_keys` |
| `PROD_DEPLOY_PATH` | `/opt/finance-app` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook (optional; deploy notifications) |

**Variables** (same screen → Variables):

| Variable | Value |
|----------|-------|
| `PRODUCTION_DEPLOY_ENABLED` | `true` (flips the deploy gate on) |
| `PROD_URL` | `https://your-domain.com` (used by the post-deploy health check) |

`GITHUB_TOKEN` is provided automatically (used for GHCR login on the server).

Once `PRODUCTION_DEPLOY_ENABLED=true`, every green **CI Pipeline** on `main`
triggers **Deploy · Production**: it `git reset --hard origin/main` in
`/opt/finance-app`, pins the image tags in `.env`, `compose pull`, `up -d`,
and health-checks the backend.

## 6. Day-2 operations

```bash
cd /opt/finance-app
C="docker compose -f docker-compose.prod.yml"

$C ps                       # status
$C logs -f --tail=100 backend
$C restart backend
$C pull && $C up -d         # manual update to :latest
$C down                     # stop (data volumes preserved)
```

**DB backup** (cron suggestion — daily 02:30):

```bash
30 2 * * * cd /opt/finance-app && docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U finance_user finance_db | gzip > /opt/finance-app/backups/db-$(date +\%F).sql.gz
```

**Later schema migrations:** the production backend image ships only compiled
`dist/` (no `tsx`/`scripts/`), so `npm run migrate` is not available there.
Apply a new migration file manually:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U finance_user -d finance_db < migrations/00X_new.sql
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 from nginx | `… logs backend` — DB/redis healthy? `.env` secrets valid? |
| Postgres init didn't run | volume already existed; migrations only run on first init |
| Cert request fails | DNS A-record propagated? port 80 reachable? `… logs frontend` |
| Deploy job skipped | set repo variable `PRODUCTION_DEPLOY_ENABLED=true` |
| OOM / slow | swap active? `free -h`; memory limits in `docker-compose.prod.yml` |
