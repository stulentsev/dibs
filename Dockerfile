FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run check
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=30M
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node build"]
