#!/bin/bash

# This script waits for PostgreSQL to be ready and verifies it can accept connections
# Usage: ./wait-for-db.sh [host] [port] [max_attempts]

HOST=${1:-localhost}
PORT=${2:-54321}
MAX_ATTEMPTS=${3:-60}
DELAY=1

echo "Waiting for PostgreSQL at $HOST:$PORT..."

# First, wait for the server to accept connections
for i in $(seq 1 $MAX_ATTEMPTS); do
  pg_isready -h $HOST -p $PORT > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "PostgreSQL is accepting connections!"
    break
  fi
  
  echo "Attempt $i/$MAX_ATTEMPTS: PostgreSQL is not ready yet. Waiting..."
  sleep $DELAY
  
  if [ $i -eq $MAX_ATTEMPTS ]; then
    echo "Failed to connect to PostgreSQL after $MAX_ATTEMPTS attempts."
    exit 1
  fi
done

# Then, verify we can actually run a query
for i in $(seq 1 $MAX_ATTEMPTS); do
  PGPASSWORD=postgres psql -h $HOST -p $PORT -U postgres -d postgres -c "SELECT 1" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "PostgreSQL is fully ready and accepting queries!"
    
    # Check if test database exists, create if not
    DB_EXISTS=$(PGPASSWORD=postgres psql -h $HOST -p $PORT -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='test'")
    if [ "$DB_EXISTS" != "1" ]; then
      echo "Creating test database..."
      PGPASSWORD=postgres psql -h $HOST -p $PORT -U postgres -c "CREATE DATABASE test" > /dev/null 2>&1
    fi
    
    echo "PostgreSQL setup complete!"
    exit 0
  fi
  
  echo "Attempt $i/$MAX_ATTEMPTS: PostgreSQL is not fully ready yet. Waiting..."
  sleep $DELAY
done

echo "Failed to verify PostgreSQL is fully operational after $MAX_ATTEMPTS attempts."
exit 1
