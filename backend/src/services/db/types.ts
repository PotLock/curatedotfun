import { SubmissionStatus } from "../../types/twitter";

export interface DbSubmission {
  tweetId: string;
  userId: string;
  username: string;
  content: string;
  curatorNotes: string | null;
  curatorId: string;
  curatorUsername: string;
  curatorTweetId: string;
  createdAt: Date;
  submittedAt: string | null;
}

export interface DbModeration {
  tweetId: string | null;
  feedId: string | null;
  adminId: string | null;
  action: string | null;
  note: string | null;
  createdAt: Date | null;
  moderationResponseTweetId: string | null;
}

export interface DbQueryResult {
  s: DbSubmission;
  m: DbModeration;
}

// Type for raw database results
export interface RawDbQueryResult {
  s: {
    tweetId: string;
    userId: string;
    username: string;
    content: string;
    curatorNotes: string | null;
    curatorId: string;
    curatorUsername: string;
    curatorTweetId: string;
    createdAt: Date;
    submittedAt: string;
  };
  m: {
    tweetId: string | null;
    feedId: string | null;
    adminId: string | null;
    action: string | null;
    note: string | null;
    createdAt: Date | null;
    moderationResponseTweetId: string | null;
  };
}

export interface DbFeedQueryResult extends DbQueryResult {
  sf: {
    status: SubmissionStatus;
  };
}
