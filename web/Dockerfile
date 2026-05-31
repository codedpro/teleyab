# syntax=docker/dockerfile:1.7
# ── Install dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build (Next.js standalone output) ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js rewrites() are evaluated at build time. The proxy origin must be set here.
ARG GO_ORIGIN=http://api:8084
ENV GO_ORIGIN=${GO_ORIGIN} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runtime image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4102 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 4102
CMD ["node", "server.js"]
