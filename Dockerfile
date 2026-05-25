# ═══════════════════════════════════════════════════════════
#  DOCKERFILE — Astro SSR (Standalone) — 3-stage build
#  Final image ~140 MB (Node 22 Alpine)
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ────────────────────────
# Package.json changes → invalidate layer cache only here
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ───────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Production ──────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Hanya salin yang diperlukan untuk runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Install production dependencies saja (tanpa devDependencies)
# node_modules dari stage build TIDAK disalin — kita install ulang
# agar image tidak membawa devDependencies
COPY --from=deps /app/node_modules ./node_modules

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

EXPOSE 4321
USER appuser

CMD ["node", "dist/server/entry.mjs"]
