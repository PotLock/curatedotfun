import { SubmissionData, SubmissionMetadata } from "../services/db/types";

export interface Submission {
  id: string;
  data: SubmissionData;
  metadata: SubmissionMetadata;
  createdAt: string;
  submittedAt: string;
  moderationHistory: ModerationAction[];
}

export interface SubmissionFeed {
  submissionId: string;
  feedId: string;
  status: SubmissionStatus;
  metadata?: Record<string, any>;
}

export interface SubmissionWithFeedData extends Submission {
  status: SubmissionStatus;
}

export interface ModerationAction {
  submissionId: string;
  feedId: string;
  action: "approve" | "reject";
  note?: string;
  timestamp: Date;
  metadata?: Record<string, any>; // Type-specific moderation data
}

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];
