#!/usr/bin/env bash
# Install the daily backup cron on the VPS. Idempotent — re-running just
# replaces the existing line. Schedule: 03:00 UTC.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/finance-app}"
LINE="0 3 * * * /usr/bin/bash $APP_DIR/deploy/backup.sh >> $APP_DIR/backups/cron.log 2>&1"

mkdir -p "$APP_DIR/backups"
touch "$APP_DIR/backups/cron.log"

# Build a new crontab: keep everything except prior backup.sh lines, then
# append our canonical line. `|| true` because crontab -l exits 1 when empty.
TMP=$(mktemp)
(crontab -l 2>/dev/null || true) | grep -v 'deploy/backup.sh' > "$TMP" || true
echo "$LINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "✓ cron installed:"
crontab -l | grep 'backup.sh'
echo ""
echo "Logs: $APP_DIR/backups/cron.log"
echo "Run once now:  sudo bash $APP_DIR/deploy/backup.sh"
