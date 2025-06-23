# ---- Base Stage ----
FROM oven/bun:1.0.25-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
FROM base AS deps
ENV BUN_INSTALL_SKIP_SCRIPTS=1
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production=false

# ---- Build Stage ----
FROM deps AS build
COPY . .
# If worker itself has a build script (e.g., tsc)
# RUN bun run --filter @curatedotfun/worker build

# ---- Final Stage ----
FROM base AS final
ENV NODE_ENV=production
# WORKER_CONCURRENCY, REDIS_HOST, REDIS_PORT, GATEWAY_API_URL etc. will be set by Kubernetes

# Copy necessary application code and built artifacts
COPY --from=build /usr/src/app/apps/worker /usr/src/app/apps/worker
COPY --from=build /usr/src/app/packages /usr/src/app/packages
COPY --from=build /usr/src/app/package.json /usr/src/app/bun.lockb* /usr/src/app/tsconfig.json ./
# COPY --from=build /usr/src/app/rspack.config.js ./ # If a root rspack config is used by worker/plugins

CMD ["bun", "run", "apps/worker/src/index.ts"]
