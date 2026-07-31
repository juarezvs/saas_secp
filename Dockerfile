# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PGCLIENTENCODING=UTF8

COPY docker/oracle /tmp/oracle

RUN set -eux; \
  apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl unzip libaio1 libnsl2 \
  && mkdir -p /opt/oracle \
  && instantclient_zip="$(find /tmp/oracle -maxdepth 1 -type f -name 'instantclient-basiclite-linux*x64*.zip' | head -n 1)" \
  && if [ -n "$instantclient_zip" ]; then cp "$instantclient_zip" /tmp/instantclient.zip; else curl -fsSL https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip -o /tmp/instantclient.zip; fi \
  && unzip -q /tmp/instantclient.zip -d /opt/oracle \
  && mv /opt/oracle/instantclient_* /opt/oracle/instantclient \
  && rm -rf /tmp/instantclient.zip /tmp/oracle \
  && echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf \
  && ldconfig \
  && rm -rf /var/lib/apt/lists/*

ENV SARH_ORACLE_HOME=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient

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

COPY . .

RUN npx prisma generate

RUN npm run build

FROM deps AS worker

ARG DATABASE_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production
ENV SECP_AUTO_WORKERS=false

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./tsconfig.json
COPY public ./public
COPY src ./src
COPY workers ./workers

RUN npx prisma generate

CMD ["npm", "run", "worker:afd"]

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
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/oracledb ./node_modules/oracledb

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
COPY scripts ./scripts

RUN npx prisma generate

CMD ["npx", "prisma", "db", "seed"]
