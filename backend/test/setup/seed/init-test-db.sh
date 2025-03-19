#!/bin/bash

# This script runs when the PostgreSQL container starts
# It initializes the database schema and seeds test data

set -e

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

echo "PostgreSQL is ready, initializing test database..."

# Initialize schema
echo "Applying schema from /docker-entrypoint-initdb.d/01-init-schema.sql..."
psql -U postgres -d test -f /docker-entrypoint-initdb.d/01-init-schema.sql

# Seed data
echo "Seeding test data from /seed/seed.sql..."
psql -U postgres -d test -f /seed/seed.sql

echo "Test database initialization complete!"
