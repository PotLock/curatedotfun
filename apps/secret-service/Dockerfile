# ---- Base Stage ----
# Standardize on node:20-alpine
FROM node:20-alpine AS base

# Install pnpm and turbo globally for use in pruner/builder stages
# Corepack will be used for pnpm in later stages if only pnpm is needed.
RUN npm install -g pnpm turbo

# ---- Pruner Stage ----
# Creates a pruned monorepo subset for the secret-service
FROM base AS pruner
WORKDIR /app

# COPY the entire monorepo context. Docker build context should be the monorepo root.
COPY . .

# Disable telemetry and prune the monorepo
# Include @curatedotfun/secret-service and its direct workspace dependencies
# Assuming secret-service might depend on shared packages like shared-db, types, utils
# Adjust scopes if dependencies are different.
RUN turbo telemetry disable
RUN turbo prune --scope=@curatedotfun/secret-service --docker
# If secret-service has other direct workspace dependencies, add them here:
# e.g., --scope=@curatedotfun/shared-db --scope=@curatedotfun/types

# ---- Builder Stage ----
# Installs all dependencies for the pruned subset and builds the secret-service
FROM base AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy pruned manifests and lockfile from pruner stage
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy other monorepo config files
COPY --from=pruner /app/turbo.json ./turbo.json
COPY --from=pruner /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/tsconfig.json ./tsconfig.json # Root tsconfig if needed by build

# Install ALL dependencies for the pruned monorepo subset (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy the full source code of the pruned monorepo subset
COPY --from=pruner /app/out/full/ .

# Build ONLY the secret-service application
ENV NODE_ENV="production"
# Ensure the filter targets the correct package name for secret-service
RUN pnpm run build --filter=@curatedotfun/secret-service

# ---- Production Stage ----
# Minimal image for running the secret-service
FROM node:20-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Enable corepack for pnpm to run 'pnpm install --prod'
RUN corepack enable

# Copy only necessary production manifests from the builder stage
COPY --from=builder --chown=app:app /app/apps/secret-service/package.json ./apps/secret-service/package.json
COPY --from=builder --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# If secret-service depends on other workspace packages (e.g., shared-db), copy their package.json too
# COPY --from=builder --chown=app:app /app/packages/shared-db/package.json ./packages/shared-db/package.json

# Set WORKDIR to the root for installing production dependencies from the workspace root perspective
WORKDIR /app

# Install only production dependencies for the entire pruned workspace.
# This ensures that dependencies of workspace packages (like shared-db) are also installed if needed at runtime.
# The --filter ensures we only install for secret-service and its dependencies.
RUN pnpm install --prod --frozen-lockfile --filter=@curatedotfun/secret-service...

# Copy built application code from the builder stage
# Copy the entire apps/secret-service directory which includes dist and other necessary files
COPY --from=builder --chown=app:app /app/apps/secret-service ./apps/secret-service

# Copy necessary built workspace dependencies from builder stage (if any)
# Example: if secret-service uses compiled output from shared-db
# COPY --from=builder --chown=app:app /app/packages/shared-db/dist ./packages/shared-db/dist

# Use the non-root user
USER app

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables that might be needed (can also be set at runtime)
ENV NODE_ENV=production
# PORT, DATABASE_URL, ENCRYPTION_MASTER_KEY, SECRET_SERVICE_INTERNAL_API_KEY
# should be provided by the Railway environment.

# Set the final working directory to the secret-service application's root
WORKDIR /app/apps/secret-service

# Command to run the application
# This uses the 'start' script from package.json: "node dist/index.js"
CMD ["node", "dist/index.js"]
