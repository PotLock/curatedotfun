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
  moderationResponseTweetId?: string | null; // Keep null for DB compatibility if schema uses null
  // DB schema has createdAt, updatedAt - consider if needed here for UI
  createdAt?: Date; 
  updatedAt?: Date | null;
}

export interface Moderation {
  adminId: string;
  action: "approve" | "reject";
  timestamp: Date; // Corresponds to 'createdAt' from SelectModerationHistory
  tweetId: string; // original submission tweet ID
  feedId: string;
  note: string | null;
  moderationResponseTweetId?: string | null; // From SubmissionFeed, not ModerationHistory table
}

// This is the primary Submission type for use in services and potentially frontend.
// It aligns `moderationHistory` with what the database provides.
export interface Submission {
  tweetId: string;
  userId: string;
  username: string;
  curatorId: string;
  curatorUsername: string;
  content: string;
  curatorNotes: string | null;
  curatorTweetId: string;
  createdAt: Date; // Original tweet creation time
  submittedAt: Date | null; // Time of submission to our system
  moderationHistory: Moderation[]; // From shared-db
  feeds: SubmissionFeed[]; // Array of feeds this submission is part of
  status?: SubmissionStatus; // Overall status, might be derived or specific if not in multiple feeds
}

// For displaying feed statuses related to a submission, e.g., in an admin panel
export interface FeedStatusInfo {
  feedId: string;
  feedName: string; // This would need to be joined/fetched
  status: SubmissionStatus;
  moderationResponseTweetId?: string | null;
}

// If a specific DTO is needed for submission lists that differs from the main Submission type
export interface SubmissionListItemDto extends Omit<Submission, "feeds" | "moderationHistory" | "content" | "curatorNotes"> {
  feedStatuses?: FeedStatusInfo[]; // Overview of statuses in different feeds
  // other summary fields
}
