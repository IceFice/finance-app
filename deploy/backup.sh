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
#  Restore (example):
#    gunzip -c finance-2026-05-26.sql.gz | \
#      docker compose -f /opt/finance-app/docker-compose.prod.yml \
#        exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
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

# ── Retention ───────────────────────────────────────────────────────────────
# Drop dumps older than RETAIN_DAYS days. Find then -delete is atomic per file.
echo "▶ Pruning dumps older than ${RETAIN_DAYS} days"
PRUNED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'finance-*.sql.gz' \
         -mtime "+${RETAIN_DAYS}" -print -delete | wc -l)
echo "  pruned $PRUNED file(s)"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "Existing backups:"
ls -lh "$BACKUP_DIR"/finance-*.sql.gz 2>/dev/null | tail -n 10 || echo "  (none)"

echo ""
echo "✅ Backup OK — $OUT"
