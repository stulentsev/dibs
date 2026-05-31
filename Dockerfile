FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10.34.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm@10.34.1
RUN pnpm run check
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10.34.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node build"]
