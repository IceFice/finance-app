# Production Deployment Checklist

Work through this list before every production deployment.

---

## 1. Secrets & Environment

- [ ] `JWT_ACCESS_SECRET` — 64-char hex, generated with `crypto.randomBytes(64)`, unique to production
- [ ] `JWT_REFRESH_SECRET` — 64-char hex, **different** from access secret, unique to production
- [ ] `DATABASE_URL` — points to production PostgreSQL, not staging/dev
- [ ] `DATABASE_SSL=true` — SSL enabled for database connection
- [ ] `REDIS_URL` — starts with `rediss://` (TLS), not `redis://`
- [ ] `BCRYPT_ROUNDS=12` — not lower
- [ ] `NODE_ENV=production` — explicitly set
- [ ] `FRONTEND_URL` — production domain, no trailing slash
- [ ] No `.env` file in the repository — secrets injected via platform/secret manager
- [ ] Secrets are different from development and staging

---

## 2. Database

- [ ] All 6 migrations have run successfully
- [ ] RLS (Row-Level Security) is enabled — `004_rls_policies.sql` applied
- [ ] `app_user` role exists and has correct privileges
- [ ] `app.current_user_id` setting works (`SELECT current_setting('app.current_user_id')`)
- [ ] `amount_base` generated column exists on `transactions`
- [ ] Indexes from `003_indexes.sql` are present
- [ ] System categories seeded from `006_seed_categories.sql`
- [ ] Database backup configured and tested

---

## 3. Security Headers & CORS

- [ ] `helmet()` middleware active
- [ ] `FRONTEND_URL` is the exact production origin (no wildcard)
- [ ] Rate limiting active: 5 auth requests / 15 min per IP
- [ ] Rate limiting active: 200 API requests / min per user
- [ ] `/health` endpoint does not expose sensitive info

---

## 4. Infrastructure

- [ ] HTTPS enforced — no plain HTTP access
- [ ] HTTP → HTTPS redirect at load balancer / reverse proxy level
- [ ] PostgreSQL not exposed to public internet
- [ ] Redis not exposed to public internet
- [ ] Server firewall allows only ports 80, 443 (and 22 for SSH if needed)

---

## 5. Monitoring & Observability

- [ ] Application logs configured (no secrets in log output)
- [ ] `/health` endpoint monitored by uptime checker
- [ ] Database connection errors alert on-call
- [ ] Disk space / memory alerts configured

---

## 6. Before Go-Live

- [ ] Run `npm run env:check` on the production server
- [ ] Test registration → login → refresh → logout flow end-to-end
- [ ] Test password reset email (if SMTP configured)
- [ ] Load test critical endpoints (transactions list, dashboard)

---

## Platform-Specific Secret Injection

### Railway / Render
Set variables in the dashboard under **Variables** / **Environment**.
Never use the `--env-file` flag in production start commands.

### Docker
```yaml
# docker-compose.production.yml
services:
  api:
    image: finance-api:latest
    environment:
      NODE_ENV: production
      PORT: 4000
    env_file: []          # do NOT use env_file in production
    secrets:
      - db_url
      - jwt_access_secret
      - jwt_refresh_secret
    ports:
      - "4000:4000"

secrets:
  db_url:
    external: true        # defined with `docker secret create`
  jwt_access_secret:
    external: true
  jwt_refresh_secret:
    external: true
```

Read secrets from files at `/run/secrets/<name>` in the app:
```typescript
// src/config/index.ts extension for Docker secrets
function readDockerSecret(name: string): string | undefined {
  try {
    return require('fs').readFileSync(`/run/secrets/${name}`, 'utf8').trim();
  } catch {
    return undefined;
  }
}

process.env.DATABASE_URL ??= readDockerSecret('db_url');
process.env.JWT_ACCESS_SECRET ??= readDockerSecret('jwt_access_secret');
process.env.JWT_REFRESH_SECRET ??= readDockerSecret('jwt_refresh_secret');
```

### Kubernetes
```yaml
# k8s/secret.yaml (values stored base64-encoded)
apiVersion: v1
kind: Secret
metadata:
  name: finance-api-secrets
type: Opaque
stringData:
  JWT_ACCESS_SECRET: "your-generated-secret"
  JWT_REFRESH_SECRET: "your-generated-secret"
  DATABASE_URL: "postgresql://..."
---
# In Deployment spec:
envFrom:
  - secretRef:
      name: finance-api-secrets
```

Use **Sealed Secrets** or **External Secrets Operator** to avoid storing plain secrets in git.

---

## Secret Rotation Procedure

1. Generate new secret: `node scripts/generate-secrets.js`
2. Set new secret in secret manager / platform variables
3. Deploy new version of the app (it will accept new tokens)
4. All existing refresh tokens remain valid until they expire (30 days)
5. Users will naturally re-authenticate as old access tokens expire (15 min)
6. Remove old secret after all active refresh tokens have expired

> For emergency rotation (secret leaked): invalidate all refresh tokens in the database:
> ```sql
> UPDATE refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;
> ```
> Then rotate the secret — all users will be forced to log in again.
