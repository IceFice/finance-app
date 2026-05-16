#!/usr/bin/env bash
# ============================================================================
# Enable HTTPS via Let's Encrypt (webroot/http-01).
# Prerequisites:
#   • DNS A-record:  <domain> → 147.45.219.215  (propagated)
#   • The stack is already running (frontend nginx serving :80)
#
#   cd /opt/finance-app
#   bash deploy/enable-ssl.sh finance.example.com you@example.com
# ============================================================================
set -euo pipefail

DOMAIN="${1:?usage: enable-ssl.sh <domain> <email>}"
EMAIL="${2:?usage: enable-ssl.sh <domain> <email>}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$APP_DIR"
mkdir -p deploy/certbot/www deploy/certbot/conf

echo "▶ Sanity: $DOMAIN must resolve to this server"
RESOLVED="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
echo "  $DOMAIN → ${RESOLVED:-<unresolved>}"

echo "▶ Requesting certificate (webroot via running nginx)…"
docker run --rm \
  -v "$APP_DIR/deploy/certbot/conf:/etc/letsencrypt" \
  -v "$APP_DIR/deploy/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email --non-interactive

echo "▶ Activating HTTPS nginx config for $DOMAIN"
sed "s/__DOMAIN__/${DOMAIN}/g" deploy/nginx/app.ssl.conf > deploy/nginx/active.conf
$COMPOSE exec frontend nginx -t
$COMPOSE exec frontend nginx -s reload

echo "▶ Installing auto-renewal cron (03:17 daily, reload nginx on renew)"
RENEW_CMD="cd $APP_DIR && docker run --rm -v $APP_DIR/deploy/certbot/conf:/etc/letsencrypt -v $APP_DIR/deploy/certbot/www:/var/www/certbot certbot/certbot renew --webroot -w /var/www/certbot --quiet && $COMPOSE exec -T frontend nginx -s reload"
( crontab -l 2>/dev/null | grep -v 'certbot/certbot renew' ; echo "17 3 * * * $RENEW_CMD" ) | crontab -

echo
echo "✅ HTTPS enabled for https://${DOMAIN}"
echo "   Remember to set in /opt/finance-app/.env :"
echo "     FRONTEND_URL=https://${DOMAIN}"
echo "   then: $COMPOSE up -d --force-recreate backend"
