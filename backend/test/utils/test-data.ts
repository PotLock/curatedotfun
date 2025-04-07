/**
 * Test data factories for generating test data
 */

/**
 * Creates a mock tweet for testing
 * @param overrides Properties to override in the default tweet
 * @returns A mock tweet object
 */
export function createMockTweet(overrides = {}) {
  const id = Date.now().toString();
  return {
    id,
    text: `Test tweet ${id}`,
    username: "testuser",
    userId: "testuser_id",
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

/**
 * Creates a mock curator tweet for testing
 * @param originalTweetId The ID of the original tweet being curated
 * @param feedIds Array of feed IDs to submit to
 * @returns A mock curator tweet object
 */
export function createMockCuratorTweet(
  originalTweetId: string,
  feedIds = ["test-feed"],
) {
  const id = Date.now().toString();
  return {
    id,
    text: `@test_bot !submit ${feedIds.map((id) => `#${id}`).join(" ")}`,
    username: "curator",
    userId: "curator_id",
    inReplyToStatusId: originalTweetId,
    timeParsed: new Date(),
    hashtags: feedIds,
    mentions: [{ username: "test_bot", id: "test_bot_id" }],
    photos: [],
    urls: [],
    videos: [],
    thread: [],
  };
}

/**
 * Creates a mock moderator tweet for testing
 * @param curatorTweetId The ID of the curator tweet being moderated
 * @param action The moderation action ('approve' or 'reject')
 * @returns A mock moderator tweet object
 */
export function createMockModeratorTweet(
  curatorTweetId: string,
  action: "approve" | "reject",
) {
  const id = Date.now().toString();
  return {
    id,
    text: `@test_bot !${action}`,
    username: "moderator",
    userId: "moderator_id",
    inReplyToStatusId: curatorTweetId,
    timeParsed: new Date(),
    hashtags: [],
    mentions: [{ username: "test_bot", id: "test_bot_id" }],
    photos: [],
    urls: [],
    videos: [],
    thread: [],
  };
}

// Counter to ensure unique IDs even when tests run in quick succession
let submissionCounter = 0;

/**
 * Creates a mock submission for testing
 * @param overrides Properties to override in the default submission
 * @returns A mock submission object
 */
export function createMockSubmission(overrides = {}) {
  // Ensure unique tweet IDs by combining timestamp with a counter
  submissionCounter++;
  const tweetId = `${Date.now()}_${submissionCounter}_${Math.floor(Math.random() * 10000)}`;

  return {
    tweetId,
    userId: "testuser_id",
    username: "testuser",
    content: `Test tweet ${tweetId}`,
    curatorId: "curator_id",
    curatorUsername: "curator",
    curatorTweetId: `curator_${tweetId}`,
    // These fields need to be Date objects for PostgreSQL
    submittedAt: new Date(),
    curatorNotes: "",
    createdAt: new Date(),
    moderationHistory: [],
    ...overrides,
  };
}
