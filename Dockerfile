# ── Stage 1: Build ───────────────────────────────────────
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ── Stage 2: Runtime ─────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

EXPOSE 4321
USER app

CMD ["node", "dist/server/entry.mjs"]
