# Build stage
FROM node:20 AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy package files
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY backend/drizzle.config.ts ./backend/

# Install dependencies
RUN cd frontend && npm install
RUN cd backend && npm install --workspace=false

# Copy source code
COPY frontend ./frontend
COPY backend ./backend

# Build frontend
RUN cd frontend && npm run build

# Build backend (rspack will copy frontend dist to backend/dist/public)
ENV NODE_ENV="production"
RUN cd backend && npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

# Install LiteFS and runtime dependencies
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fuse3 \
    sqlite3 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Copy LiteFS binary
COPY --from=flyio/litefs:0.5 /usr/local/bin/litefs /usr/local/bin/litefs

# Create directories for mounts with correct permissions
RUN mkdir -p /litefs /var/lib/litefs && \
    chown -R node:node /litefs /var/lib/litefs

# Create volume mount points
ENV DATABASE_URL="file:/litefs/db"

# Copy application files
COPY --from=builder --chown=node:node /app/package.json ./
COPY --chown=node:node curate.config.json ./
COPY --from=builder --chown=node:node /app/backend ./backend

# Install production dependencies without workspace hoisting
RUN cd backend && \
    npm install --workspace=false && \
    npm rebuild better-sqlite3

# Copy LiteFS configuration
COPY --chown=node:node litefs.yml /etc/litefs.yml

# Expose the port
EXPOSE 3000

# Set secure environment defaults
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Start LiteFS (runs app with distributed file system for SQLite)
ENTRYPOINT ["litefs", "mount"]
