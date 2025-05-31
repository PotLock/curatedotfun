# Base stage with common dependencies
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm turbo

# Builder stage for pruning the monorepo
FROM base AS pruner
WORKDIR /app

COPY . .

# Disable telemetry and prune the monorepo to include only what's needed
RUN turbo telemetry disable
# Prune the monorepo to include only backend and shared-db
RUN turbo prune --scope=@curatedotfun/backend --scope=@curatedotfun/shared-db --docker

# Builder stage for installing dependencies and building
FROM base AS builder
WORKDIR /app

# Copy pruned package.json files and workspace config
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/turbo.json ./turbo.json
COPY --from=pruner /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install dependencies using pnpm workspaces
RUN pnpm install --frozen-lockfile

# Copy source code from pruned monorepo
COPY --from=pruner /app/out/full/ .

# Build the application using turbo (which will respect the dependencies in turbo.json)
ENV NODE_ENV="production"
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy only the necessary files from the builder stage
COPY --from=builder --chown=app:app /app/backend/dist ./backend/dist
COPY --from=builder --chown=app:app /app/backend/package.json ./backend/package.json

# Copy shared-db files necessary for migrations
COPY --from=builder --chown=app:app /app/packages/shared-db/package.json ./packages/shared-db/package.json
COPY --from=builder --chown=app:app /app/packages/shared-db/drizzle.config.ts ./packages/shared-db/drizzle.config.ts
COPY --from=builder --chown=app:app /app/packages/shared-db/migrations ./packages/shared-db/migrations
COPY --from=builder --chown=app:app /app/packages/shared-db/src ./packages/shared-db/src
COPY --from=builder --chown=app:app /app/packages/shared-db/dist ./packages/shared-db/dist

# Copy root monorepo configurations
COPY --from=builder --chown=app:app /app/package.json ./
COPY --from=builder --chown=app:app /app/pnpm-lock.yaml ./
COPY --from=builder --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=app:app curate.config.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies:
  # - All dependencies (including dev like drizzle-kit) for shared-db to allow migrations
# - Production dependencies for the backend application
RUN pnpm install --frozen-lockfile --filter @curatedotfun/shared-db
RUN pnpm install --prod --frozen-lockfile --filter @curatedotfun/backend

# Use the non-root user
USER app

# Expose the port
EXPOSE 3000

# Start the application
CMD ["pnpm", "run", "--dir", "backend", "start"]
