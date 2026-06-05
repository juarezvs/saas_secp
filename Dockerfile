# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

FROM deps AS builder

ARG DATABASE_URL
ARG AUTH_SECRET
ARG NEXTAUTH_SECRET
ARG AUTH_URL
ARG NEXTAUTH_URL
ARG REDIS_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV AUTH_URL=${AUTH_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV REDIS_URL=${REDIS_URL}
ENV NODE_ENV=production

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npx prisma generate

COPY . .

RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

FROM deps AS migrator

ARG DATABASE_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npx prisma generate

CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS seeder

ARG DATABASE_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npx prisma generate

CMD ["npx", "prisma", "db", "seed"]