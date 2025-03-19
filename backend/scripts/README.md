# PostgreSQL Development Environment

This directory contains scripts and configuration files for setting up and using PostgreSQL with Drizzle ORM in the curate.fun project.

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js / Bun
- PostgreSQL client (optional, for direct database access)

### Starting the Development Environment

1. Start the PostgreSQL containers:

```bash
docker-compose up -d
```

This will start:
- A PostgreSQL database for development on port 5432
- A PostgreSQL database for testing on port 5433

2. Initialize the database schema:

The schema will be automatically initialized when the container starts using the scripts in `scripts/init-db/`.

3. Migrate data from SQLite (if needed):

```bash
bun run scripts/migrate-sqlite-to-postgres.js
```

This script will migrate data from the SQLite database (`backend/.db/submissions.sqlite`) to PostgreSQL.

### Environment Configuration

The project includes several environment configuration files:

- `backend/.env.development` - Development environment with PostgreSQL
- `backend/.env.test` - Test environment with isolated PostgreSQL database

### Running the Application

1. Use the development environment:

```bash
cd backend
bun run dev
```

This will start the application using the PostgreSQL database.

### Running Tests

Tests use a separate PostgreSQL database to avoid affecting development data:

```bash
cd backend
bun run test
```

## Database Architecture

The project uses PostgreSQL with Drizzle ORM:

- Read/write separation with connection pools
- Transaction support with retry logic
- Error handling and connection management
- Singleton pattern for database service

## Docker Compose Configuration

The `docker-compose.yml` file includes:

- PostgreSQL container for development
- PostgreSQL container for testing
- Volume for persistent data
- Health checks for service dependencies

## Migration Scripts

- `scripts/migrate-sqlite-to-postgres.js` - Migrates data from SQLite to PostgreSQL
- `scripts/init-db/01-init-schema.sql` - Initializes the PostgreSQL schema

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check if the PostgreSQL containers are running:

```bash
docker-compose ps
```

2. Check the container logs:

```bash
docker-compose logs postgres
docker-compose logs postgres_test
```

3. Verify the connection string in your environment files.

### Data Migration Issues

If data migration fails:

1. Check if the SQLite database exists at the expected location
2. Verify that the PostgreSQL containers are running and healthy
3. Check the migration script logs for specific errors

### Reset Development Environment

To reset the development environment:

```bash
docker-compose down -v
docker-compose up -d
```

This will remove all data and start with a clean database.
