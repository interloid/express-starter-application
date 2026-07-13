# ============================================================
# Builder stage — install deps, generate Prisma client, compile TS
# ============================================================
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY src/newrelic.cjs ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

RUN npm prune --omit=dev

# ============================================================
# Runner stage — minimal production image
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl curl

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/newrelic.cjs ./newrelic.cjs

ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:8080/health/live || exit 1

CMD ["npm", "run", "start:prod"]