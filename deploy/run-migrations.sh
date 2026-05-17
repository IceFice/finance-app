#!/usr/bin/env bash
# ============================================================================
# Idempotent migration runner for the production stack.
#
# The prod backend image ships only compiled dist/ (no tsx/scripts), so the
# tsx migrate runner isn't available there. This applies pending migrations
# via psql inside the postgres container, tracking them in schema_migrations
# exactly like backend/scripts/migrate.ts.
#
# Baseline: the very first prod DB was initialised by /docker-entrypoint-initdb.d
# (001–007) WITHOUT a schema_migrations table. On first run, if the core schema
# already exists, 001–007 are recorded as already-applied so only 008+ run.
#
#   cd /opt/finance-app && bash deploy/run-migrations.sh
# ============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

# Load POSTGRES_USER / POSTGRES_DB from the deploy env.
set -a; . ./.env; set +a
: "${POSTGRES_USER:?POSTGRES_USER missing in .env}"
: "${POSTGRES_DB:?POSTGRES_DB missing in .env}"

COMPOSE="docker compose -f docker-compose.prod.yml"

# psql helper: -tA = tuples-only, unaligned (clean scalar output)
psql_q() { $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tA -c "$1"; }

echo "▶ Ensuring schema_migrations table"
psql_q "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" >/dev/null

COUNT="$(psql_q "SELECT count(*) FROM schema_migrations;")"
HAS_CORE="$(psql_q "SELECT (to_regclass('public.users') IS NOT NULL);")"

if [ "$COUNT" = "0" ] && [ "$HAS_CORE" = "t" ]; then
  echo "▶ Baseline: core schema exists, marking 001–007 as already applied"
  for f in migrations/00[1-7]_*.sql; do
    bn="$(basename "$f")"
    psql_q "INSERT INTO schema_migrations (filename) VALUES ('$bn') ON CONFLICT DO NOTHING;" >/dev/null
  done
fi

applied_any=0
for f in $(ls migrations/*.sql | sort); do
  bn="$(basename "$f")"
  is_applied="$(psql_q "SELECT 1 FROM schema_migrations WHERE filename='$bn';")"
  if [ "$is_applied" = "1" ]; then
    echo "  ⏭  $bn (already applied)"
    continue
  fi
  echo "  ▶  applying $bn"
  $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 --single-transaction < "$f"
  psql_q "INSERT INTO schema_migrations (filename) VALUES ('$bn');" >/dev/null
  echo "  ✅ $bn"
  applied_any=1
done

[ "$applied_any" = "0" ] && echo "▶ No pending migrations" || echo "✅ Migrations applied"
