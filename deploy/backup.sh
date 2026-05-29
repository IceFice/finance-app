#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Бабкосчёт — daily Postgres backup
#  Dumps the live DB out of the running compose stack, gzip-compresses it,
#  stores under /opt/finance-app/backups/, and prunes anything older than
#  RETAIN_DAYS. Designed to be invoked from cron as root or `deploy` user.
#
#  USAGE
#    sudo bash /opt/finance-app/deploy/backup.sh           # run now
#    sudo bash /opt/finance-app/deploy/install-backup-cron.sh   # daily 03:00
#
#  OPTIONAL HARDENING (set in $APP_DIR/.env or the environment):
#    BACKUP_GPG_RECIPIENT  — GPG key id/email; dump is encrypted to .sql.gz.gpg
#                            (asymmetric — only the private key holder can read)
#    BACKUP_GPG_PASSPHRASE  — alternative: symmetric AES256 with this passphrase
#    BACKUP_S3_BUCKET       — s3://bucket/prefix; encrypted dump is uploaded
#                            with server-side encryption (--sse AES256)
#    BACKUP_S3_ENDPOINT     — custom S3 endpoint (для S3-совместимых, напр. Selectel)
#  When none are set, behaviour is identical to before: a local .sql.gz.
#
#  Restore (example):
#    # plain:
#    gunzip -c finance-….sql.gz | docker compose -f … exec -T postgres \
#      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#    # gpg (asymmetric):
#    gpg --decrypt finance-….sql.gz.gpg | gunzip -c | docker compose … psql …
#    # gpg (symmetric):
#    gpg --batch --passphrase "$BACKUP_GPG_PASSPHRASE" -d finance-….sql.gz.gpg | …
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/finance-app}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"

# .env holds POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB used by the
# postgres service. We re-read it here so credentials never end up in
# command lines or process listings.
if [ ! -f "$APP_DIR/.env" ]; then
  echo "❌ $APP_DIR/.env not found — cannot read DB credentials"
  exit 1
fi

# shellcheck disable=SC1091
set -a; source "$APP_DIR/.env"; set +a

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "❌ POSTGRES_USER / POSTGRES_DB missing from $APP_DIR/.env"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$BACKUP_DIR/finance-$STAMP.sql.gz"

echo "▶ pg_dump → $OUT"
# `-T` keeps STDIN/STDOUT clean — no terminal allocation.
# Pipe through gzip on the host so we don't burn container CPU for compression.
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --clean --if-exists --no-owner --no-acl \
          -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✓ dump complete ($SIZE)"

# ── Encryption (optional) ─────────────────────────────────────────────────────
# Encrypt at rest so a compromised VPS / leaked backup file doesn't expose
# password hashes and the full transaction history in cleartext.
if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  echo "▶ Encrypting (gpg, recipient ${BACKUP_GPG_RECIPIENT})"
  gpg --batch --yes --trust-model always \
      --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
      --output "$OUT.gpg" "$OUT"
  shred -u "$OUT" 2>/dev/null || rm -f "$OUT"
  OUT="$OUT.gpg"
  echo "✓ encrypted → $OUT"
elif [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "▶ Encrypting (gpg symmetric AES256)"
  gpg --batch --yes --cipher-algo AES256 \
      --passphrase "$BACKUP_GPG_PASSPHRASE" \
      --symmetric --output "$OUT.gpg" "$OUT"
  shred -u "$OUT" 2>/dev/null || rm -f "$OUT"
  OUT="$OUT.gpg"
  echo "✓ encrypted → $OUT"
else
  echo "⚠  No BACKUP_GPG_* set — backup stored UNENCRYPTED. Set BACKUP_GPG_RECIPIENT"
  echo "   or BACKUP_GPG_PASSPHRASE to encrypt at rest."
fi

# ── Off-site upload (optional) ────────────────────────────────────────────────
# Push the (encrypted) dump to S3 so a dead/wiped VPS doesn't take backups
# with it. Server-side encryption on top of our own gpg layer.
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "▶ Uploading to ${BACKUP_S3_BUCKET}"
    AWS_ARGS=(s3 cp "$OUT" "${BACKUP_S3_BUCKET%/}/$(basename "$OUT")" --sse AES256)
    [ -n "${BACKUP_S3_ENDPOINT:-}" ] && AWS_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
    if aws "${AWS_ARGS[@]}"; then
      echo "✓ uploaded to S3"
    else
      echo "❌ S3 upload failed — keeping local copy"
    fi
  else
    echo "⚠  BACKUP_S3_BUCKET set but 'aws' CLI not installed — skipping upload"
  fi
fi

# ── Retention ───────────────────────────────────────────────────────────────
# Drop dumps older than RETAIN_DAYS days. Covers both plain .sql.gz and
# encrypted .sql.gz.gpg. Find then -delete is atomic per file.
echo "▶ Pruning dumps older than ${RETAIN_DAYS} days"
PRUNED=$(find "$BACKUP_DIR" -maxdepth 1 -type f \
         \( -name 'finance-*.sql.gz' -o -name 'finance-*.sql.gz.gpg' \) \
         -mtime "+${RETAIN_DAYS}" -print -delete | wc -l)
echo "  pruned $PRUNED file(s)"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "Existing backups:"
ls -lh "$BACKUP_DIR"/finance-*.sql.gz* 2>/dev/null | tail -n 10 || echo "  (none)"

echo ""
echo "✅ Backup OK — $OUT"
