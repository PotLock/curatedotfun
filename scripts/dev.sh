#!/bin/bash

# Parse command line arguments
FRESH=false
SKIP_DB=false
for arg in "$@"
do
  case $arg in
    --fresh)
    FRESH=true
    shift # Remove --fresh from processing
    ;;
    --skip-db)
    SKIP_DB=true
    shift # Remove --skip-db from processing
    ;;
    *)
    # Unknown option
    ;;
  esac
done

# Function to clean up Docker containers
cleanup() {
  echo ""
  echo "🛑 Cleaning up Docker containers..."
  if [ "$FRESH" = true ]; then
    echo "🧹 Removing volumes for fresh start next time..."
    docker-compose --profile dev down -v
  else
    echo "💾 Stopping containers but preserving data..."
    docker-compose --profile dev down
  fi
  exit 0
}

# Trap SIGINT and SIGTERM signals to clean up Docker containers
trap cleanup SIGINT SIGTERM EXIT

# Set DATABASE_URL environment variable for the dev process
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curatedotfun"

if [ "$SKIP_DB" = true ]; then
  echo "⏩ Skipping database setup as requested with --skip-db"
else
  # Check if postgres_dev is already running
  if docker ps | grep -q postgres_dev; then
    echo "🐘 PostgreSQL container is already running."
  else
    # Start Docker containers
    echo "🚀 Starting Docker containers..."
    
    # If --fresh flag is provided, remove existing volumes first
    if [ "$FRESH" = true ]; then
      echo "🧹 Starting with fresh database..."
      docker-compose --profile dev down -v
    fi
    
    # Start postgres container
    echo "🐘 Starting PostgreSQL container..."
    docker-compose --profile dev up -d postgres_dev
    
    # Check if postgres container started successfully
    if [ $? -ne 0 ]; then
      echo "❌ Failed to start PostgreSQL container."
      
      # Check if the port is already in use
      if lsof -i :5432 > /dev/null; then
        echo "⚠️ Port 5432 is already in use. This might be causing the issue."
        echo "👉 You can try one of the following:"
        echo "   1. Stop the existing PostgreSQL service: brew services stop postgresql"
        echo "   2. Run with --skip-db to skip database setup (if you have PostgreSQL running elsewhere)"
        echo "   3. Modify docker-compose.yml to use a different port"
      fi
      
      echo "🧹 Cleaning up..."
      cleanup
      exit 1
    fi
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
      if docker exec postgres_dev pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
      fi
      if [ $i -eq 30 ]; then
        echo "❌ Timed out waiting for PostgreSQL to be ready."
        echo "🧹 Cleaning up..."
        cleanup
        exit 1
      fi
      sleep 1
    done
    
    # Run database initialization
    echo "🔄 Initializing database..."
    # Pass the FRESH environment variable to the db-init-dev service
    docker-compose --profile dev run --rm -e FRESH=$FRESH db-init-dev
    
    # Check if database initialization was successful
    if [ $? -ne 0 ]; then
      echo "❌ Failed to initialize database."
      echo "🧹 Cleaning up..."
      cleanup
      exit 1
    fi
    
    echo "✅ Database setup complete!"
  fi
fi

# Run the dev command
echo "🚀 Starting development servers..."
echo "📝 Press Ctrl+C to stop all services and clean up containers"
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔌 Backend will be available at: http://localhost:3000"
echo ""

turbo run dev
