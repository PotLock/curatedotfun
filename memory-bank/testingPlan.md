# Testing Plan

## Testing Strategy

The testing strategy for curate.fun follows a comprehensive approach that leverages the new architecture's improved testability. The refactored architecture with dependency injection, clear separation of concerns, and standardized patterns makes testing more straightforward and effective.

### Testing Levels

1. **Unit Tests**
   - **Scope**: Individual functions, methods, and classes
   - **Focus**: Business logic, utility functions, transformations
   - **Tools**: Bun Test
   - **Approach**: Mock all dependencies, test in isolation
   - **Location**: `backend/test/unit/`

2. **Integration Tests**
   - **Scope**: Interactions between components
   - **Focus**: Repository-database interactions, service-repository interactions
   - **Tools**: Bun Test, test database
   - **Approach**: Use real database with test data, mock external services
   - **Location**: `backend/test/integration/`

3. **Component Tests**
   - **Scope**: End-to-end flows within the application
   - **Focus**: Critical business flows (submission, moderation, distribution)
   - **Tools**: Bun Test, Docker Compose for dependencies
   - **Approach**: Test complete flows with minimal mocking
   - **Location**: `backend/test/component/`

4. **E2E Tests**
   - **Scope**: Full application from external perspective
   - **Focus**: API endpoints, external integrations
   - **Tools**: Bun Test, test client
   - **Approach**: Black-box testing of the entire application
   - **Location**: `backend/test/e2e/`

### Test Implementation

#### Unit Tests

Unit tests will focus on testing individual components in isolation:

- **Services**: Test business logic with mocked repositories and dependencies
- **Repositories**: Test query building and result mapping with mocked database
- **Utilities**: Test helper functions and transformations
- **Error Handling**: Test error cases and recovery mechanisms

Example unit test for a service:

```typescript
// backend/test/unit/services/submission.service.test.ts
import { describe, test, expect, mock } from 'bun:test';
import { SubmissionService } from '../../../src/services/submission/submission.service';
import { SubmissionRepository } from '../../../src/services/db/repositories/submission.repository';
import { FeedRepository } from '../../../src/services/db/repositories/feed.repository';
import { ProcessorService } from '../../../src/services/processor/processor.service';
import { NotFoundError } from '../../../src/core/errors';

describe('SubmissionService', () => {
  // Mock dependencies
  const mockSubmissionRepo = {
    findById: mock(() => Promise.resolve({ tweetId: '123', /* ... */ })),
    create: mock(() => Promise.resolve({ tweetId: '123', /* ... */ })),
  } as unknown as SubmissionRepository;
  
  const mockFeedRepo = {
    findFeedsBySubmissionId: mock(() => Promise.resolve([])),
    findSubmissionFeed: mock(() => Promise.resolve({ status: 'PENDING' })),
    updateSubmissionFeedStatus: mock(() => Promise.resolve()),
  } as unknown as FeedRepository;
  
  const mockProcessorService = {
    process: mock(() => Promise.resolve()),
  } as unknown as ProcessorService;
  
  // Create service instance with mocked dependencies
  const service = new SubmissionService(
    mockSubmissionRepo,
    mockFeedRepo,
    mockProcessorService,
  );
  
  test('getSubmissionById returns submission with feeds', async () => {
    const result = await service.getSubmissionById('123');
    expect(result).toBeDefined();
    expect(result.tweetId).toBe('123');
    expect(mockSubmissionRepo.findById).toHaveBeenCalledWith('123');
    expect(mockFeedRepo.findFeedsBySubmissionId).toHaveBeenCalledWith('123');
  });
  
  test('getSubmissionById throws NotFoundError when submission not found', async () => {
    mockSubmissionRepo.findById.mockImplementationOnce(() => Promise.resolve(null));
    await expect(service.getSubmissionById('456')).rejects.toThrow(NotFoundError);
  });
  
  // More tests...
});
```

#### Integration Tests

Integration tests will focus on testing interactions between components:

- **Repository-Database**: Test repository methods against a real test database
- **Service-Repository**: Test services with real repositories but mocked external services
- **API-Service**: Test API routes with real services but mocked external dependencies

Example integration test for a repository:

```typescript
// backend/test/integration/repositories/submission.repository.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { SubmissionRepository } from '../../../src/services/db/repositories/submission.repository';
import { DbConnection } from '../../../src/services/db/connection';
import { setupTestDatabase, teardownTestDatabase } from '../../utils/test-database';

describe('SubmissionRepository Integration', () => {
  let dbConnection: DbConnection;
  let repository: SubmissionRepository;
  
  beforeAll(async () => {
    // Setup test database with known state
    await setupTestDatabase();
    dbConnection = DbConnection.getInstance();
    repository = new SubmissionRepository(dbConnection);
  });
  
  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });
  
  test('findById returns submission when exists', async () => {
    const submission = await repository.findById('known-tweet-id');
    expect(submission).toBeDefined();
    expect(submission?.tweetId).toBe('known-tweet-id');
  });
  
  test('findById returns null when submission does not exist', async () => {
    const submission = await repository.findById('non-existent-id');
    expect(submission).toBeNull();
  });
  
  test('create inserts new submission', async () => {
    const newSubmission = {
      tweetId: 'new-tweet-id',
      userId: 'user123',
      username: 'testuser',
      content: 'Test content',
      curatorId: 'curator123',
      curatorUsername: 'curator',
      curatorTweetId: 'curator-tweet-123',
      // ... other required fields
    };
    
    const result = await repository.create(newSubmission);
    expect(result).toBeDefined();
    expect(result.tweetId).toBe('new-tweet-id');
    
    // Verify it was actually inserted
    const retrieved = await repository.findById('new-tweet-id');
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('Test content');
  });
  
  // More tests...
});
```

#### Component Tests

Component tests will focus on testing complete flows:

- **Submission Flow**: Test the entire submission process from creation to distribution
- **Moderation Flow**: Test the moderation process and status updates
- **Recap Flow**: Test the recap generation and distribution

Example component test for the submission flow:

```typescript
// backend/test/component/submission-flow.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { setupTestEnvironment, teardownTestEnvironment } from '../utils/test-environment';
import { createApp } from '../../src/app';
import { TestClient } from '../utils/test-client';

describe('Submission Flow', () => {
  let app;
  let client: TestClient;
  
  beforeAll(async () => {
    // Setup test environment with all required services
    await setupTestEnvironment();
    app = await createApp();
    client = new TestClient(app);
  });
  
  afterAll(async () => {
    // Clean up test environment
    await teardownTestEnvironment();
  });
  
  test('complete submission flow', async () => {
    // 1. Create a submission
    const submission = {
      tweetId: 'test-tweet-id',
      userId: 'user123',
      username: 'testuser',
      content: 'Test content',
      curatorId: 'curator123',
      curatorUsername: 'curator',
      curatorTweetId: 'curator-tweet-123',
      // ... other required fields
    };
    
    const createResponse = await client.post('/submissions', submission);
    expect(createResponse.status).toBe(201);
    const createdSubmission = await createResponse.json();
    expect(createdSubmission.tweetId).toBe('test-tweet-id');
    
    // 2. Link submission to a feed
    const linkResponse = await client.post(`/submissions/${submission.tweetId}/feeds/test-feed`);
    expect(linkResponse.status).toBe(200);
    
    // 3. Approve the submission
    const approveResponse = await client.post(`/submissions/${submission.tweetId}/feeds/test-feed/approve`);
    expect(approveResponse.status).toBe(200);
    
    // 4. Verify the submission was processed and distributed
    const getResponse = await client.get(`/submissions/${submission.tweetId}`);
    expect(getResponse.status).toBe(200);
    const retrievedSubmission = await getResponse.json();
    expect(retrievedSubmission.status).toBe('APPROVED');
    
    // 5. Verify distribution (this would depend on how we can verify distribution)
    // For example, check a mock distributor's records
    // const distributionRecords = await mockDistributor.getRecords();
    // expect(distributionRecords).toContainEqual(expect.objectContaining({ tweetId: 'test-tweet-id' }));
  });
  
  // More tests...
});
```

#### E2E Tests

E2E tests will focus on testing the application from an external perspective:

- **API Endpoints**: Test all API endpoints with real data
- **Error Handling**: Test error responses and recovery
- **Performance**: Test response times and resource usage

Example E2E test:

```typescript
// backend/test/e2e/api.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startServer, stopServer } from '../utils/server';
import fetch from 'node-fetch';

describe('API Endpoints', () => {
  let baseUrl: string;
  
  beforeAll(async () => {
    // Start the server
    const port = await startServer();
    baseUrl = `http://localhost:${port}`;
  });
  
  afterAll(async () => {
    // Stop the server
    await stopServer();
  });
  
  test('GET /api/submissions returns submissions', async () => {
    const response = await fetch(`${baseUrl}/api/submissions`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
  
  test('GET /api/feeds returns feeds', async () => {
    const response = await fetch(`${baseUrl}/api/feeds`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
  
  test('POST /api/submissions creates a submission', async () => {
    const submission = {
      tweetId: 'e2e-test-tweet-id',
      userId: 'user123',
      username: 'testuser',
      content: 'E2E Test content',
      curatorId: 'curator123',
      curatorUsername: 'curator',
      curatorTweetId: 'curator-tweet-123',
      // ... other required fields
    };
    
    const response = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.tweetId).toBe('e2e-test-tweet-id');
  });
  
  // More tests...
});
```

### Testing Utilities

To support the testing strategy, we'll implement several testing utilities:

1. **Test Database Setup**
   - Create and seed a test database with known data
   - Clean up after tests
   - Support transaction rollbacks for test isolation

2. **Test Client**
   - Wrapper around Hono app for easy API testing
   - Support for authentication and headers
   - Simplified request/response handling

3. **Mock Factories**
   - Create mock data for tests
   - Generate consistent test entities
   - Support customization of mock data

4. **Test Environment**
   - Set up all required dependencies for component tests
   - Configure test-specific settings
   - Clean up resources after tests

### Continuous Integration

Tests will be run as part of the CI/CD pipeline:

1. **Pull Request Checks**
   - Run unit and integration tests
   - Verify code quality and test coverage
   - Block merges if tests fail

2. **Deployment Checks**
   - Run all tests including E2E tests
   - Verify performance and resource usage
   - Block deployment if tests fail

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage of business logic
- **Integration Tests**: 70%+ coverage of repository methods
- **Component Tests**: Cover all critical flows
- **E2E Tests**: Cover all API endpoints

## Benefits of the New Architecture for Testing

The refactored architecture provides several benefits for testing:

1. **Dependency Injection**
   - Easier mocking of dependencies
   - More isolated unit tests
   - Better control over test scope

2. **Clear Separation of Concerns**
   - Test business logic independently from data access
   - Test route handlers independently from services
   - Focus tests on specific responsibilities

3. **Standardized Patterns**
   - Consistent testing approaches across components
   - Reusable test utilities and helpers
   - Predictable component behavior

4. **Type Safety**
   - Catch type errors at compile time
   - Better IDE support for test writing
   - More reliable test assertions

5. **Error Handling**
   - Test error cases more effectively
   - Verify error recovery mechanisms
   - Ensure consistent error responses
