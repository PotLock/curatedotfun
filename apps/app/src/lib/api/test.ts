import { useApiMutation } from "../../hooks/api-client";
export interface Tweet {
  id: string;
  text: string;
  username: string;
  userId: string;
  timeParsed: Date;
  hashtags: string[];
  mentions: { username: string; id: string | null }[];
  photos: { id: string; url: string }[];
  urls: string[];
  videos: unknown[];
  thread: Tweet[];
  inReplyToStatusId?: string;
}

interface MockTweetSubmissionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface MockTweetSubmissionVariables {
  text: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
}

export function useMockTweetSubmission() {
  return useApiMutation<
    MockTweetSubmissionResponse,
    Error,
    MockTweetSubmissionVariables
  >({
    method: "POST",
    path: `/test/mock-submission`,
    message: "mockTweetSubmission",
  });
}

interface CreateTestTweetVariables {
  text: string;
  username: string;
  inReplyToStatusId?: string;
  hashtags?: string[];
}

export function useCreateTestTweet() {
  return useApiMutation<Tweet, Error, CreateTestTweetVariables>({
    method: "POST",
    path: `/test/tweets`,
    message: "createTestTweet",
  });
}
