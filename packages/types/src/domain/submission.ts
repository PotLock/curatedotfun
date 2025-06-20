import { ModerationAction } from "../api/moderation";

export const SubmissionStatusEnum = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatusEnum)[keyof typeof SubmissionStatusEnum];

export interface SubmissionFeed {
  submissionId: string;
  feedId: string;
  status: SubmissionStatus;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface Submission {
  tweetId: string;
  userId: string;
  username: string;
  curatorId: string;
  curatorUsername: string;
  content: string;
  curatorNotes: string | null;
  curatorTweetId: string;
  createdAt: Date;
  submittedAt: Date | null;
  updatedAt?: Date | null;
  moderationHistory: ModerationAction[];
  feeds: SubmissionFeed[];
  status?: SubmissionStatus;
}

export interface FeedContextSubmission {
  tweetId: string;
  userId: string;
  username: string;
  curatorId: string;
  curatorUsername: string;
  content: string;
  curatorNotes: string | null;
  curatorTweetId: string;
  createdAt: Date;
  submittedAt: Date | null;
  updatedAt?: Date | null;

  status: SubmissionStatus;

  moderationHistory: ModerationAction[];
}
