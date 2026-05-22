#!/usr/bin/env bash
# ============================================================================
# One-time VPS bootstrap — Ubuntu 24.04, 1 vCPU / 2 GB.
# Run as root (or with sudo) on 147.45.219.215:
#
#   ssh root@147.45.219.215
#   curl -fsSL https://raw.githubusercontent.com/IceFice/finance-app/main/deploy/server-setup.sh | bash
#   # …or copy the repo over and run: bash deploy/server-setup.sh
# ============================================================================
set -euo pipefail

APP_DIR=/opt/finance-app
REPO_URL=https://github.com/IceFice/finance-app.git

echo "▶ [1/6] System update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw

echo "▶ [2/6] 3 GB swap (RAM is only 2 GB — cushions deploy/Postgres spikes)"
if [ ! -f /swapfile ]; then
  fallocate -l 3G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # swappiness=30: lean on swap a bit BEFORE the kernel resorts to OOM-killing
  # (a slow process beats a dead sshd). Keep cache pressure modest.
  sysctl -w vm.swappiness=30
  echo 'vm.swappiness=30' > /etc/sysctl.d/99-swappiness.conf
fi

echo "▶ [3/6] Install Docker Engine + compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "▶ [4/6] Firewall (SSH + HTTP + HTTPS only)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "▶ [5/6] App directory + repo (for compose file, nginx config, migrations)"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi
cd "$APP_DIR"
mkdir -p deploy/certbot/www deploy/certbot/conf
# Activate the HTTP nginx config (SSL is enabled later via enable-ssl.sh)
cp -f deploy/nginx/app.conf deploy/nginx/active.conf

echo "▶ [6/6] Production env file"
if [ ! -f "$APP_DIR/.env" ]; then
  cp deploy/.env.production.example .env
  echo
  echo "  ⚠  Created $APP_DIR/.env from the template."
  echo "     Edit it now and set REAL secrets:"
  echo "       nano $APP_DIR/.env"
  echo "     Generate JWT secrets with:"
  echo "       docker run --rm node:20-alpine node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
fi

echo
echo "✅ Bootstrap complete."
echo
echo "Next steps:"
echo "  1. Edit secrets:        nano $APP_DIR/.env"
echo "  2. Log in to GHCR:      echo <GHCR_PAT> | docker login ghcr.io -u IceFice --password-stdin"
echo "  3. First deploy:        cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"
echo "  4. (after DNS) SSL:     bash deploy/enable-ssl.sh <domain> <email>"
