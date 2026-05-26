# syntax=docker/dockerfile:1.7
# Build context = repository root (matches frontend/Dockerfile and CI).
#   docker build -f backend/Dockerfile -t <img> .

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install only production dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src

RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nodejs -G nodejs

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps  --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy compiled output from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy package.json for runtime metadata (no secrets here)
COPY --chown=nodejs:nodejs backend/package.json ./

# Copy OpenAPI spec — served at /api/v1/docs (Swagger UI) and
# /api/v1/openapi.json. Path resolves from cwd at runtime.
COPY --chown=nodejs:nodejs backend/openapi ./openapi

# Drop to non-root user
USER nodejs

# Expose application port (matches PORT env var default)
EXPOSE 4000

# Healthcheck — calls /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
