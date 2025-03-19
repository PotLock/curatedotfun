# Testing Setup

This directory contains the testing infrastructure for the curate.fun project.

## Docker-based Testing

The project uses Docker to run tests against a real PostgreSQL database. This ensures that tests run in a consistent environment and can test database interactions properly.

### Files

- `Dockerfile`: Docker configuration for running tests
- `wait-for-db.sh`: Script to wait for the PostgreSQL database to be ready before running tests

### Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests in Docker
npm run test:docker

# Run only integration tests in Docker
npm run test:docker:integration

# Run tests in watch mode in Docker
npm run test:docker:watch
```

### GitHub Actions Integration

The project uses GitHub Actions to run tests automatically on pull requests and pushes to the main branch. The workflow configuration is in `.github/workflows/test.yml`.

## Test Structure

- Unit tests: `backend/src/__tests__/*.test.ts`
- Integration tests: `backend/src/__tests__/integration/*.test.ts`
- Mocks: `backend/src/__tests__/mocks/`

## Adding New Tests

1. Add unit tests in the appropriate directory
2. For integration tests that require a database, add them to `backend/src/__tests__/integration/`
3. Run the tests using `npm run test:docker` to ensure they work in the Docker environment
