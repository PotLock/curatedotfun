export interface FeedStatus {
  feedId: string;
  feedName: string;
  status: SubmissionStatus;
  moderationResponseTweetId?: string;
}

export interface TwitterSubmission {
  tweetId: string;
  userId: string;
  username: string;
  curatorId: string;
  curatorUsername: string;
  content: string;
  curatorNotes: string | null;
  curatorTweetId: string;
  createdAt: string;
  submittedAt: string | null;
  moderationHistory: Moderation[];
  status?: SubmissionStatus;
}

export interface TwitterSubmissionWithFeedData extends TwitterSubmission {
  status: SubmissionStatus;
  moderationResponseTweetId?: string;
  feedStatuses?: FeedStatus[]; 
}

export interface Moderation {
  adminId: string;
  action: "approve" | "reject";
  timestamp: Date;
  tweetId: string;
  feedId: string;
  note: string | null;
  moderationResponseTweetId?: string;
}

export interface TwitterConfig {
  username: string;
  password: string;
  email: string;
}

export interface TwitterCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export interface SubmissionFeed {
  submissionId: string;
  feedId: string;
  status: SubmissionStatus;
  moderationResponseTweetId?: string;
}
