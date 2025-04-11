# Testing Implementation Plan

This document outlines the comprehensive plan for implementing a new test suite for the curate.fun platform based on Node.js testing best practices.

## Current Issues

After reviewing the codebase against Node.js testing best practices, we've identified several areas for improvement:

1. **Over-reliance on Mocks**: The current tests focus on individual services with heavy mocking, rather than testing components as a whole.
2. **Fake Database**: The database is completely mocked rather than using a real database for testing.
3. **Inconsistent Test Data Management**: No clear strategy for cleaning up data between tests.
4. **Limited HTTP Integration Testing**: External HTTP calls are mocked, but there's limited testing of error scenarios.
5. **Insufficient Message Queue Testing**: No clear testing of message queue interactions.
6. **Hidden Mocks**: Mocks are defined in separate files, making it harder to understand what's being mocked.

## Directory Structure

We'll organize our tests into the following structure:

```
backend/
├── src/
│   ├── __tests__/                      # Current test directory (to be refactored)
│   └── ...
└── test/                               # New test directory
    ├── setup/                          # Test setup files
    │   ├── global-setup.ts             # Global setup for all tests
    │   ├── global-teardown.ts          # Global teardown for all tests
    │   ├── docker-compose.yml          # Docker compose for test infrastructure
    │   └── fake-mq.ts                  # Fake message queue implementation
    ├── utils/                          # Test utilities
    │   ├── test-client.ts              # HTTP client for API testing
    │   ├── test-data.ts                # Test data factories
    │   └── test-helpers.ts             # Helper functions for tests
    ├── component/                      # Component tests (primary focus)
    │   ├── submission-flow.test.ts     # Tests for submission flow
    │   ├── approval-flow.test.ts       # Tests for approval flow
    │   └── distribution-flow.test.ts   # Tests for distribution flow
    ├── unit/                           # Unit tests (secondary focus)
    │   ├── sanitize.test.ts            # Tests for sanitization utilities
    │   └── transformation.test.ts      # Tests for transformation logic
    ├── integration/                    # Integration tests
    │   ├── database.test.ts            # Database integration tests
    │   ├── twitter-api.test.ts         # Twitter API integration tests
    │   └── message-queue.test.ts       # Message queue integration tests
    └── e2e/                            # End-to-end tests
        └── full-flow.test.ts           # Full flow from submission to distribution
```

## Packages to Use

1. **Testing Framework**:
   - Continue using Bun for testing (`bun:test`)
   - Consider adding Jest for additional features if needed

2. **Docker and Infrastructure**:
   - `docker-compose` - For managing test infrastructure
   - `testcontainers` - For programmatic container management

3. **Database**:
   - Continue using the existing database library (better-sqlite3)
   - Add `pg` for PostgreSQL testing

4. **HTTP Testing**:
   - `axios` - For making HTTP requests to the API
   - `nock` - For intercepting and mocking external HTTP requests

5. **Assertion Libraries**:
   - Continue using the built-in assertion library
   - Add `chai` or `jest-extended` for additional assertions if needed

6. **Utilities**:
   - `faker` or `@faker-js/faker` - For generating test data
   - `sinon` - For advanced mocking and stubbing
   - `node-fetch` - For making HTTP requests in tests

7. **Message Queue**:
   - Create a custom fake MQ implementation
   - Add `amqplib` for RabbitMQ testing if needed

## Test Cases to Write

### Component Tests (Primary Focus)

1. **Submission Flow**:
   - When a tweet is submitted to a feed, it should be saved and pending approval
   - When a tweet is submitted to multiple feeds, it should be saved to all feeds
   - When a tweet is submitted by a moderator, it should be auto-approved
   - When a tweet is submitted by a blacklisted user, it should be rejected
   - When a tweet is resubmitted to a different feed, it should be added to that feed

2. **Approval Flow**:
   - When a moderator approves a submission, it should be processed and distributed
   - When a moderator rejects a submission, it should be marked as rejected
   - When a non-moderator tries to approve a submission, it should be ignored
   - When a submission is already moderated, further moderation attempts should be ignored

3. **Distribution Flow**:
   - When a submission is approved, it should be distributed to all configured channels
   - When a distribution channel fails, other channels should still receive the content
   - When all distribution channels fail, the submission should be marked accordingly

4. **Error Handling**:
   - When the Twitter API fails, the system should handle it gracefully
   - When the database connection fails, the system should handle it gracefully
   - When a transformation fails, the system should continue with the original content

### Unit Tests (Secondary Focus)

1. **Sanitization**:
   - Test JSON sanitization for various input types
   - Test handling of BOM characters
   - Test handling of nested stringified JSON

2. **Transformation**:
   - Test applying transforms in sequence
   - Test handling invalid transform output
   - Test handling different transform stages
   - Test propagating plugin errors

### Integration Tests

1. **Database Integration**:
   - Test database connection and queries
   - Test transaction handling
   - Test error handling for database operations

2. **Twitter API Integration**:
   - Test fetching tweets from Twitter
   - Test handling Twitter API rate limits
   - Test handling Twitter API errors

3. **Message Queue Integration**:
   - Test publishing messages to the queue
   - Test consuming messages from the queue
   - Test handling message acknowledgment and rejection
   - Test handling queue connection failures

### E2E Tests (Minimal)

1. **Full Flow**:
   - Test the full flow from Twitter submission to distribution
   - Test the recap generation and distribution flow

## Best Practices to Follow

1. **Component Testing Strategy**:
   - Start with integration/component tests
   - Run a very few E2E tests
   - Cover features, not functions
   - Write tests during coding, never after
   - Test the five known backend exit doors (outcomes)

2. **Infrastructure and Database Setup**:
   - Use Docker-Compose to host the database and other infrastructure
   - Start docker-compose using code in the global setup process
   - Shutoff the infrastructure only in the CI environment
   - Optimize your real DB for testing, don't fake it
   - Store test data in RAM folder
   - Build the DB schema using migrations

3. **Web Server Setup**:
   - The test and the backend should live within the same process
   - Let the tests control when the server should start and shutoff
   - Specify a port in production, randomize in testing

4. **Test Anatomy**:
   - Stick to unit testing best practices, aim for great developer-experience
   - Approach the API using a library that is a pure HTTP client
   - Provide real credentials or token
   - Assert on the entire HTTP response object, not on every field
   - Structure tests by routes and stories
   - Test the five potential outcomes

5. **Integration Testing**:
   - Isolate the component from the world using HTTP interceptor
   - Define default responses before every test to ensure a clean slate
   - Override the happy defaults with corner cases using unique paths
   - Deny all outgoing requests by default
   - Simulate network chaos
   - Catch invalid outgoing requests by specifying the request schema
   - Record real outgoing requests for awareness
   - Code against a strict API provider contract
   - Fake the time to minimize network call duration

6. **Data Management**:
   - Each test should act on its own records only
   - Only metadata and context data should get pre-seeded to the database
   - Assert the new data state using the public API
   - Choose a clear data clean-up strategy: After-all (recommended) or after-each
   - Add some randomness to unique fields
   - Test also the response schema
   - Install the DB schema using the same technique like production
   - Test for undesired side effects

7. **Message Queue Testing**:
   - Use a fake MQ for the majority of testing
   - Promisify the test. Avoid polling, indentation, and callbacks
   - Test message acknowledgment and 'nack-cknowledgment'
   - Test processing of messages batch
   - Test for 'poisoned' messages
   - Test for idempotency
   - Avoid a zombie process by testing connection failures
   - On top of development testing, write a few E2E tests

8. **Mocking Strategy**:
   - Spot the Good Mocks from the Evil Ones
   - Avoid Hidden, Surprising Mocks
   - Be Mindful About Partial Mocks
   - Clean Up All Mocks Before Every Test
   - Be Mindful About the Mocking Mechanism
   - Type your mocks
   - Use spyOn for direct function mocking
   - Prefer direct function mocking over module mocking when possible
   - Ensure mocked functions properly handle async operations

## Mocking Best Practices

### Using spyOn for Direct Function Mocking

When mocking functions that are imported directly, use `spyOn` to create a spy on the function:

```typescript
// Import the module containing the functions to mock
import * as transaction from "../../../src/services/db/transaction";

// Create a spy on the function
const executeOperationSpy = spyOn(transaction, "executeOperation").mockImplementation(async (callback, isWrite = false) => {
  // Implement the mock behavior
  return await callback({ mockDb: true });
});

// In your test, you can then assert that the function was called
expect(executeOperationSpy).toHaveBeenCalled();
```

### Handling Async Operations in Mocks

When mocking functions that return promises, make sure to properly handle async operations:

```typescript
// For functions that return a value
const getSubmissionSpy = spyOn(queries, "getSubmission").mockImplementation(async () => {
  return { id: "123", name: "Test Submission" };
});

// For functions that might need to return different values in different tests
getSubmissionSpy.mockResolvedValueOnce({ id: "123", name: "Test Submission" });

// For functions that should throw an error
getSubmissionSpy.mockRejectedValueOnce(new Error("Database error"));
```

### Cleaning Up Mocks Between Tests

Always reset your mocks before each test to ensure test isolation:

```typescript
beforeEach(() => {
  // Reset all spies before each test
  executeOperationSpy.mockClear();
  getSubmissionSpy.mockClear();
});
```

## Implementation Steps

1. **Set up Docker-Compose for testing infrastructure**:
   - Create a docker-compose.yml file with PostgreSQL configured for testing
   - Add configuration for any other required infrastructure
   - Implement global setup and teardown scripts

```typescript
// global-setup.ts
import { execSync } from 'child_process';
import path from 'path';

export default async () => {
  console.time('global-setup');
  
  // Start Docker Compose
  const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
  execSync(`docker-compose -f ${dockerComposePath} up -d`);
  
  // Wait for services to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run migrations
  execSync('bun run db:migrate');
  
  console.timeEnd('global-setup');
};
```

```yaml
# docker-compose.yml
version: '3.6'
services:
  db:
    image: postgres:13
    command: postgres -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c random_page_cost=1.0
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpassword
      - POSTGRES_DB=testdb
    ports:
      - '54310:5432'
    tmpfs: /var/lib/postgresql/data
```

2. **Create a fake MQ implementation**:

```typescript
// fake-mq.ts
import { EventEmitter } from 'events';

export class FakeMessageQueue extends EventEmitter {
  private handlers: Map<string, (message: any) => Promise<void>> = new Map();
  
  async connect() {
    return this;
  }
  
  async createChannel() {
    return this;
  }
  
  async assertQueue(queue: string) {
    return { queue };
  }
  
  async consume(queue: string, handler: (message: any) => Promise<void>) {
    this.handlers.set(queue, handler);
    return { consumerTag: `consumer-${queue}` };
  }
  
  async sendToQueue(queue: string, content: Buffer) {
    const message = JSON.parse(content.toString());
    this.emit('message-sent', { queue, message });
    return true;
  }
  
  async ack(message: any) {
    this.emit('message-acknowledged', { message });
    return true;
  }
  
  async nack(message: any) {
    this.emit('message-rejected', { message });
    return true;
  }
  
  // Method for tests to simulate receiving a message
  async simulateMessage(queue: string, message: any) {
    const handler = this.handlers.get(queue);
    if (handler) {
      const fakeMessage = {
        content: Buffer.from(JSON.stringify(message)),
        properties: {},
        fields: { routingKey: queue },
      };
      await handler(fakeMessage);
    }
  }
}
```

3. **Create test utilities**:

```typescript
// test-client.ts
import axios, { AxiosInstance } from 'axios';

export function createTestClient(port: number): AxiosInstance {
  return axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true, // Don't throw on non-2xx responses
  });
}
```

```typescript
// test-data.ts
export function createMockTweet(overrides = {}) {
  const id = Date.now().toString();
  return {
    id,
    text: `Test tweet ${id}`,
    username: 'testuser',
    userId: 'testuser_id',
    timeParsed: new Date(),
    hashtags: [],
    mentions: [],
    photos: [],
    urls: [],
    videos: [],
    thread: [],
    ...overrides,
  };
}

export function createMockCuratorTweet(originalTweetId: string, feedIds = ['test-feed']) {
  const id = Date.now().toString();
  return {
    id,
    text: `@test_bot !submit ${feedIds.map(id => `#${id}`).join(' ')}`,
    username: 'curator',
    userId: 'curator_id',
    inReplyToStatusId: originalTweetId,
    timeParsed: new Date(),
    hashtags: feedIds,
    mentions: [{ username: 'test_bot', id: 'test_bot_id' }],
    photos: [],
    urls: [],
    videos: [],
    thread: [],
  };
}
```

4. **Write component tests**:

```typescript
// submission-flow.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import nock from 'nock';
import { createTestClient } from '../utils/test-client';
import { createMockTweet, createMockCuratorTweet } from '../utils/test-data';
import { initializeWebServer } from '../../src/app';

describe('Submission Flow', () => {
  let apiClient;
  let server;
  
  beforeAll(async () => {
    server = await initializeWebServer();
    apiClient = createTestClient(server.port);
    
    // Disable external network requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });
  
  afterAll(async () => {
    await server.close();
    nock.enableNetConnect();
  });
  
  beforeEach(() => {
    nock.cleanAll();
    
    // Set up default mocks
    nock('http://localhost/user/')
      .get(/.*/)
      .reply(200, {
        id: 'user1_id',
        name: 'User 1',
      });
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  test('When a tweet is submitted to a feed, it should be saved and pending approval', async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);
    
    // Mock Twitter API
    nock('https://api.twitter.com')
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);
    
    // Act
    const response = await apiClient.post('/api/test/twitter/mention', {
      tweet: curatorTweet,
    });
    
    // Assert
    expect(response.status).toBe(200);
    
    // Verify the submission was saved
    const submissionResponse = await apiClient.get(`/api/submission/${tweet.id}`);
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: 'pending',
      feedId: 'test-feed',
    });
  });
});
```

5. **Write integration tests**:

```typescript
// database.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../../src/services/db';
import { createMockTweet } from '../utils/test-data';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Ensure database is initialized
    await db.initialize();
  });
  
  afterAll(async () => {
    // Clean up
    await db.cleanup();
  });
  
  test('Should save and retrieve a submission', async () => {
    // Arrange
    const tweet = createMockTweet();
    const submission = {
      tweetId: tweet.id,
      userId: tweet.userId,
      username: tweet.username,
      content: tweet.text,
      curatorId: 'curator_id',
      curatorUsername: 'curator',
      curatorTweetId: 'curator_tweet_id',
      submittedAt: new Date().toISOString(),
    };
    
    // Act
    await db.saveSubmission(submission);
    
    // Assert
    const retrievedSubmission = await db.getSubmission(tweet.id);
    expect(retrievedSubmission).toMatchObject({
      tweetId: tweet.id,
      userId: tweet.userId,
      username: tweet.username,
    });
  });
});
```

6. **Write E2E tests**:

```typescript
// full-flow.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import nock from 'nock';
import { createTestClient } from '../utils/test-client';
import { createMockTweet, createMockCuratorTweet, createMockModeratorTweet } from '../utils/test-data';
import { initializeWebServer } from '../../src/app';
import { FakeMessageQueue } from '../setup/fake-mq';

describe('Full Flow', () => {
  let apiClient;
  let server;
  let fakeMessageQueue;
  
  beforeAll(async () => {
    server = await initializeWebServer();
    apiClient = createTestClient(server.port);
    fakeMessageQueue = new FakeMessageQueue();
    
    // Replace the real message queue with our fake
    server.app.locals.messageQueue = fakeMessageQueue;
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  test('Full flow from submission to distribution', async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);
    
    // Mock Twitter API
    nock('https://api.twitter.com')
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);
    
    // Mock distribution service
    nock('http://distribution-service')
      .post('/distribute')
      .reply(200);
    
    // Act - Submit tweet
    const submissionResponse = await apiClient.post('/api/test/twitter/mention', {
      tweet: curatorTweet,
    });
    
    // Assert submission
    expect(submissionResponse.status).toBe(200);
    
    // Act - Approve submission
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, 'approve');
    const approvalResponse = await apiClient.post('/api/test/twitter/mention', {
      tweet: moderatorTweet,
    });
    
    // Assert approval
    expect(approvalResponse.status).toBe(200);
    
    // Verify the submission was approved
    const submissionStatusResponse = await apiClient.get(`/api/submission/${tweet.id}`);
    expect(submissionStatusResponse.status).toBe(200);
    expect(submissionStatusResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: 'approved',
    });
    
    // Verify distribution was called
    expect(nock.isDone()).toBe(true);
  });
});
```

## Items to Change

1. **Database Mocking**:
   - Replace the current database mocking with a real database in Docker
   - Update the database service to support testing with a real database
   - Implement a database cleanup strategy

2. **Test Structure**:
   - Create a new test directory structure as outlined above
   - Move existing tests to the appropriate directories
   - Refactor tests to follow the best practices

3. **Test Setup**:
   - Implement global setup and teardown scripts
   - Create Docker Compose configuration for test infrastructure
   - Implement a fake message queue for testing

4. **Component Tests**:
   - Create component tests for key flows
   - Implement HTTP interceptors for external services
   - Test error scenarios and edge cases

5. **Integration Tests**:
   - Create integration tests for database, Twitter API, and message queue
   - Test error handling and recovery

6. **E2E Tests**:
   - Create a minimal set of E2E tests for full flows
   - Test the system as a whole

7. **Test Utilities**:
   - Create test utilities for common operations
   - Implement test data factories
   - Create a test client for API testing

8. **Configuration**:
   - Update package.json with new test scripts
   - Configure test environment variables
   - Set up CI/CD pipeline for testing

## Conclusion

This implementation plan provides a comprehensive approach to improving the test suite for the curate.fun platform. By following the Node.js testing best practices and implementing the changes outlined in this document, we will create a more robust and reliable test suite that provides high confidence in the system's behavior while maintaining good performance and developer experience.

The focus on component tests will ensure that we test the system as a whole, while still maintaining the ability to test individual components in isolation when necessary. The use of real infrastructure in Docker will ensure that our tests are as close to production as possible, while still being fast and reliable.

By implementing this plan, we will address the current issues with the test suite and create a more maintainable and effective testing strategy for the future.
