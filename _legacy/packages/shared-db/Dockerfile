FROM node:18-alpine AS base

RUN npm install -g pnpm turbo

# Pruner stage
FROM base AS pruner
WORKDIR /app
COPY . .
# Prune for the shared-db package and its dependencies
RUN turbo prune --scope=@curatedotfun/shared-db --docker

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

# Production stage: Minimal image to run migrations
FROM node:18-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages/shared-db ./packages/shared-db

# run the migration and then go to sleep
ENTRYPOINT ["/bin/sh", "-c", "cd packages/shared-db && pnpm db:migrate && sleep infinity"]
