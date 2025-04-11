# Testing Strategy

This directory contains tests for the curate.fun backend. The tests are organized into different categories based on their scope and purpose.

## Test Categories

- **Unit Tests**: Test individual functions and classes in isolation
- **Component Tests**: Test multiple components working together
- **Integration Tests**: Test integration with external systems like the database
- **E2E Tests**: Test the entire application from end to end

## PostgreSQL Testing

The project has migrated from SQLite to PostgreSQL for testing. This provides a more realistic testing environment that matches production.

### Setup

The PostgreSQL testing environment is set up using Docker Compose. The `docker-compose.yml` file in the `setup` directory defines a PostgreSQL container that is used for testing.

To start the PostgreSQL container:

```bash
npm run docker:test:up
```

To stop the PostgreSQL container:

```bash
npm run docker:test:down
```

### Running Tests with PostgreSQL

To run tests with PostgreSQL:

```bash
# Run all tests with PostgreSQL
npm run test:pg

# Run only integration tests with PostgreSQL
npm run test:pg:integration

# Run only component tests with PostgreSQL
npm run test:pg:component

# Run only E2E tests with PostgreSQL
npm run test:pg:e2e
```

These commands will:
1. Start the PostgreSQL container
2. Run the migrations to set up the schema
3. Run the tests
4. Clean up the database after tests

### Test Environment

The test environment is configured in `.env.test`. This file sets the database connection string and other environment variables for testing.

### Test Data

The test database is seeded with a consistent set of test data defined in `setup/seed-test.sql`. This includes:

- Test feeds
- Test submissions
- Test submission feeds
- Test moderation history
- Test feed plugins
- Test submission counts

This seed data provides a consistent starting point for all tests, making them more reliable and predictable.

### Global Setup and Teardown

The `setup/global-setup.ts` and `setup/global-teardown.ts` files handle the setup and teardown of the test environment. They:

1. Start the PostgreSQL container
2. Wait for PostgreSQL to be ready
3. Set environment variables for the test database
4. Run migrations to set up the schema
5. Seed the database with test data
6. Clean up after tests

## Writing Tests

When writing tests that interact with the database:

1. Use the `db` service from `src/services/db`
2. Make sure to clean up data after tests
3. Use transactions when possible to isolate tests
4. Use the `createMockSubmission` helper to create test data

Example:

```typescript
import { db } from "../../src/services/db";
import { createMockSubmission } from "../utils/test-data";

describe("Database Integration", () => {
  beforeEach(async () => {
    // Clean up tables before each test
    await pgPool.query("DELETE FROM submission_feeds");
    await pgPool.query("DELETE FROM submissions");
  });

  test("Should save and retrieve a submission", async () => {
    // Arrange
    const submission = createMockSubmission();

    // Act
    await db.saveSubmission(submission);

    // Assert
    const retrievedSubmission = await db.getSubmission(submission.tweetId);
    expect(retrievedSubmission).toMatchObject({
      tweetId: submission.tweetId,
      userId: submission.userId,
      username: submission.username,
    });
  });
});
```

## Mocking vs. Real Database

For unit tests, you can use the database mocks in `src/__tests__/mocks/db-service.mock.ts`.

For component, integration, and E2E tests, use the real PostgreSQL database to ensure realistic behavior.
