# syntax=docker/dockerfile:1.7
# Build context = repository root (so deploy/nginx/app.conf is reachable).
#   docker build -f frontend/Dockerfile -t <img> .

# ── Stage 1: build the React/Vite static bundle ───────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts ./
COPY frontend/postcss.config.js frontend/tailwind.config.ts frontend/index.html ./
COPY frontend/src ./src
COPY frontend/public ./public

# src/lib/api.ts uses the relative baseURL "/api/v1" — no build-time API URL
# needed; nginx reverse-proxies /api to the backend container.
RUN npm run build

# ── Stage 2: nginx serving the SPA + reverse-proxying /api ────────────────────
FROM nginx:1.27-alpine AS runtime

# Baked-in default config (HTTP + ACME). In production the host mounts
# deploy/nginx/app.conf over this path so SSL can be toggled without a rebuild.
COPY deploy/nginx/app.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

# ACME webroot for Let's Encrypt http-01 challenges
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
