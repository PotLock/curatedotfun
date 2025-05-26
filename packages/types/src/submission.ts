import type {
  SelectModerationHistory,
  SelectSubmission,
  SelectSubmissionFeed,
  SubmissionStatus
} from "./db";

export interface FeedStatus {
  feedId: string;
  feedName: string; // This might come from SelectFeed.name
  status: SubmissionStatus;
  moderationResponseTweetId?: string;
}

// Base Submission type using SelectSubmission from shared-db
// You might need to adjust fields based on what SelectSubmission exactly contains
// and what additional properties are added at the application level.
export interface Submission extends Omit<SelectSubmission, "createdAt" | "submittedAt"> {
  // Overriding with Date type if SelectSubmission has string dates, or ensure SelectSubmission has Date
  createdAt: Date;
  submittedAt: Date | null;
  username: string; // Ensure these are part of SelectSubmission or added if not
  curatorUsername: string;
  media?: Array<{ type: string; url: string;[key: string]: any }>; // This seems custom
  moderationHistory: SelectModerationHistory[]; // Array of moderation history records
  status?: SubmissionStatus; // Explicitly use the shared SubmissionStatus
  feeds?: SelectSubmissionFeed[]; // Array of submission feed records
  curatorPlatformId?: string;
  recapId?: string;
}

// Moderation type using SelectModerationHistory from shared-db
export interface Moderation extends Omit<SelectModerationHistory, "createdAt" | "timestamp" | "action"> {
  // Assuming SelectModerationHistory has createdAt and not timestamp, adjust as needed
  // Or if it has timestamp, ensure it's Date
  timestamp: Date; // Ensure this is a Date
  action: "approve" | "reject"; // This should match the type in SelectModerationHistory if it's an enum there
  // Or define it as a string if the DB stores it as text.
  // adminId, tweetId, feedId, note should come from SelectModerationHistory
  moderationResponseTweetId?: string;
}
