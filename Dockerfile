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
# Prune the monorepo to include only backend and frontend
RUN turbo prune --scope=@curatedotfun/backend --scope=@curatedotfun/frontend --docker

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
COPY --from=builder --chown=app:app /app/backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY --from=builder --chown=app:app /app/backend/src/services/db/migrations ./backend/src/services/db/migrations
COPY --from=builder --chown=app:app /app/backend/src/services/db/schema.ts ./backend/src/services/db/schema.ts
COPY --from=builder --chown=app:app /app/backend/src/services/twitter/schema.ts ./backend/src/services/twitter/schema.ts
COPY --from=builder --chown=app:app /app/package.json ./
COPY --from=builder --chown=app:app /app/pnpm-lock.yaml ./
COPY --from=builder --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=app:app curate.config.json ./

# Install pnpm
RUN npm install -g pnpm

# Install only production dependencies
RUN cd backend && pnpm install --prod --frozen-lockfile

# Use the non-root user
USER app

# Expose the port
EXPOSE 3000

# Start the application
CMD ["pnpm", "run", "--dir", "backend", "start"]
