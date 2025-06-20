#!/bin/bash

# Parse command line arguments
FRESH=false
SKIP_DB=false
for arg in "$@"
do
  case $arg in
    --fresh)
    FRESH=true
    ;;
    --skip-db)
    SKIP_DB=true
    ;;
    *)
    # Unknown option
    ;;
  esac
  shift # Remove processed argument
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

echo "Running pnpm install for monorepo dependencies (if not already done)..."
pnpm install # Ensure all host dependencies are installed for turbo to work, and for db scripts when volume is mounted.

if [ "$SKIP_DB" = true ]; then
  echo "⏩ Skipping database setup as requested with --skip-db"
else
  echo "--- Database Setup ---"
  # Step 1: Handle --fresh flag by cleaning up existing containers and volumes
  if [ "$FRESH" = true ]; then
    echo "🧹 Detected --fresh flag. Bringing down existing dev containers and removing volumes."
    docker-compose --profile dev down -v || true # `|| true` to prevent script exit if containers aren't running
    sleep 1 # Give Docker a moment
  else
    echo "💾 Preserving existing database data."
  fi

  # Step 2: Start PostgreSQL container
  echo "🚀 Starting PostgreSQL container (postgres_dev)..."
  docker-compose --profile dev up -d postgres_dev

  # Step 3: Run migrations
  echo "⏳ Running database migrations..."
  # Use `docker-compose run` and rely on `depends_on` in docker-compose.yml for health check
  docker-compose --profile dev run --rm db-migrate-dev
  if [ $? -ne 0 ]; then
    echo "❌ Database migration failed. Cleaning up."
    cleanup
    exit 1
  fi
  echo "✅ Migrations complete."

  # Step 4: Conditionally run seeding
  # This can be made explicit by a new `--seed` flag, or tied to `--fresh`
  # For now, let's tie it to --fresh, meaning only seed on a totally fresh DB
  if [ "$FRESH" = true ]; then
    echo "🌱 Seeding database with dev data..."
    docker-compose --profile dev run --rm db-seed-dev
    if [ $? -ne 0 ]; then
      echo "❌ Database seeding failed. Cleaning up."
      cleanup
      exit 1
    fi
    echo "✅ Seeding complete."
  else
    echo "⏩ Skipping database seeding (run 'docker-compose --profile dev run --rm db-seed-dev' manually if needed)."
  fi
  echo "--- Database Setup Complete ---"
fi

# Run the dev command for the applications
echo ""
echo "🚀 Starting development servers (apps and api)..."
echo "📝 Press Ctrl+C to stop all services and clean up containers"
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔌 Backend will be available at: http://localhost:3000"
echo ""

turbo run dev