# Base stage with common dependencies
FROM node:18-alpine AS base

# Install pnpm and turbo
RUN npm install -g pnpm turbo

# Pruner stage: Creates a pruned monorepo subset
FROM base AS pruner
WORKDIR /app

# COPY the entire monorepo context. Docker build context should be the monorepo root.
COPY . .

# Disable telemetry and prune the monorepo to include only what's needed
RUN turbo telemetry disable
# Prune for backend and its direct workspace dependencies (shared-db, types, utils)
RUN turbo prune --scope=@curatedotfun/api --scope=@curatedotfun/shared-db --scope=@curatedotfun/types --scope=@curatedotfun/utils --docker

# Builder stage: Installs all dependencies and builds the application
FROM base AS builder
WORKDIR /app

# Copy pruned manifests and lockfile
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

COPY --from=pruner /app/turbo.json ./turbo.json
COPY --from=pruner /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/tsconfig.json ./tsconfig.json

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install ALL dependencies for the pruned monorepo subset (including devDependencies for build processes)
RUN pnpm install --frozen-lockfile

# Copy the full source code of the pruned monorepo subset
COPY --from=pruner /app/out/full/ .

# Build ONLY the backend application
ENV NODE_ENV="production"
RUN pnpm run build --filter=@curatedotfun/api

# Production stage: Minimal image for running the backend
FROM node:18-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy the production-ready code from the builder stage.
COPY --from=builder --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=app:app /app/apps/api/public ./apps/api/public
COPY --from=builder --chown=app:app /app/packages/shared-db ./packages/shared-db
COPY --from=builder --chown=app:app /app/packages/utils ./packages/utils

# Copy the node_modules directory from the builder stage.
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Use the non-root user
USER app

# Expose the port
EXPOSE 3000

# Set the final working directory to the backend application's root
WORKDIR /app/apps/api

# Start the application.
CMD ["node", "dist/main.cjs"]
