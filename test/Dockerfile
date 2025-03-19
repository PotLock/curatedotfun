# Base stage with common dependencies
FROM oven/bun:1.0.27-alpine as base

# Enable Corepack for package manager versioning
ENV BUN_HOME="/bun"
ENV PATH="$BUN_HOME:$PATH"
RUN corepack enable

# Builder stage for pruning the monorepo
FROM base AS pruner
WORKDIR /app

# Install turbo globally
RUN bun install -g turbo@latest
COPY . /app

# Disable telemetry and prune the monorepo to include only what's needed
RUN turbo telemetry disable
# Prune the monorepo to include only backend for testing
RUN turbo prune --scope=@curatedotfun/backend --docker

# Test stage for installing dependencies and running tests
FROM base AS tester
WORKDIR /app

# Copy pruned package.json files and lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lockb ./bun.lockb
COPY --from=pruner /app/turbo.json ./turbo.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code from pruned monorepo
COPY --from=pruner /app/out/full/ .

# Set environment variables for testing
ENV NODE_ENV=test
ENV DATABASE_URL=postgresql://postgres:postgres@postgres_test:5432/test

# Install PostgreSQL client for health check
RUN apk add --no-cache postgresql-client

# Copy test scripts
COPY test/wait-for-db.sh /app/wait-for-db.sh
RUN chmod +x /app/wait-for-db.sh

# Set the entrypoint to the test script
ENTRYPOINT ["/app/wait-for-db.sh"]
