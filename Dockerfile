# Base stage with common dependencies
FROM oven/bun:1.0.27-alpine as base

# Set Bun environment variables
ENV BUN_HOME="/bun"
ENV PATH="$BUN_HOME:$PATH"

# Builder stage for pruning the monorepo
FROM base AS pruner
WORKDIR /app

# Install turbo globally
RUN bun install -g turbo@latest
COPY . .

# Disable telemetry and prune the monorepo to include only what's needed
RUN turbo telemetry disable
# Prune the monorepo to include only backend and frontend
RUN turbo prune --scope=@curatedotfun/backend --scope=@curatedotfun/frontend --docker

# Builder stage for installing dependencies and building
FROM base AS builder
WORKDIR /app

# Copy pruned package.json files and lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lockb ./bun.lockb
COPY --from=pruner /app/turbo.json ./turbo.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code from pruned monorepo
COPY --from=pruner /app/out/full/ .

# Build the application
ENV NODE_ENV="production"
RUN bun run build

# Production stage
FROM oven/bun:1.0.27-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy only the necessary files from the builder stage
COPY --from=builder --chown=app:app /app/backend/dist ./backend/dist
COPY --from=builder --chown=app:app /app/backend/package.json ./backend/package.json
COPY --from=builder --chown=app:app /app/backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY --from=builder --chown=app:app /app/package.json ./
COPY --from=builder --chown=app:app /app/bun.lockb ./
COPY --chown=app:app curate.config.json ./

# Install only production dependencies
RUN cd backend && bun install --production

# Use the non-root user
USER app

# Expose the port
EXPOSE 3000

# Set secure environment defaults
ENV NODE_ENV=production

# Start the application
CMD ["bun", "run", "--cwd", "backend", "start"]
