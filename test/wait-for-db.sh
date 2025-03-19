#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres_test -p 5432 -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - running tests"
cd backend && bun test "$@"
