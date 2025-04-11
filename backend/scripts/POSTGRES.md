# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL for the curate.fun project.

## Overview

The project is transitioning from SQLite to PostgreSQL for improved scalability and performance. This migration includes:

1. Docker-based development environment
2. PostgreSQL with Drizzle ORM
3. Data migration from SQLite
4. Testing infrastructure

## Quick Start

### 1. Start the PostgreSQL Environment

```bash
npm run docker:up
```

This starts PostgreSQL containers for both development and testing.

### 2. Migrate Data from SQLite (Optional)

If you have existing SQLite data that you want to migrate:

```bash
npm run db:migrate-sqlite-to-pg
```

This will migrate data from `backend/.db/submissions.sqlite` to PostgreSQL.

### 3. Run the Application with PostgreSQL

```bash
npm run dev:pg
```

Or use the combined command:

```bash
npm run pg:dev
```

## Development Workflow

### Environment Setup

The project includes Docker Compose configuration for PostgreSQL:

- Development database on port 5432
- Testing database on port 5433
- Persistent volume for data storage
- Automatic schema initialization

### Environment Files

- `backend/.env.development` - Development environment configuration
- `backend/.env.test` - Test environment configuration

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run docker:up` | Start PostgreSQL containers |
| `npm run docker:down` | Stop PostgreSQL containers |
| `npm run docker:reset` | Reset PostgreSQL containers (removes all data) |
| `npm run docker:logs` | View PostgreSQL container logs |
| `npm run dev:pg` | Run the application with PostgreSQL |
| `npm run pg:dev` | Start PostgreSQL and run the application |
| `npm run db:migrate-sqlite-to-pg` | Migrate data from SQLite to PostgreSQL |

## Database Architecture

The project uses PostgreSQL with Drizzle ORM:

- Read/write separation with connection pools
- Transaction support with retry logic
- Error handling and connection management
- Singleton pattern for database service

## Testing

Tests use a separate PostgreSQL database to avoid affecting development data:

```bash
cd backend
bun run test
```

## Troubleshooting

See the detailed troubleshooting guide in `scripts/README.md`.

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
