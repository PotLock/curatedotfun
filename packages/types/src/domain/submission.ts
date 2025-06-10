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
  moderationResponseTweetId?: string | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface Moderation {
  adminId: string;
  action: "approve" | "reject";
  timestamp: Date;
  tweetId: string;
  feedId: string;
  note: string | null;
  moderationTweetId: string;
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
  moderationHistory: Moderation[];
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

  moderationHistory: Moderation[];
}
