import { SubmissionStatus } from "../../types/twitter";

export interface DbSubmission {
  id: string;
  data: string; // JSON string
  metadata: string; // JSON string
  createdAt: string;
  submittedAt: string;
}

export interface DbModeration {
  submissionId: string | null;
  feedId: string | null;
  action: string | null;
  metadata: string | null; // JSON string
  note: string | null;
  createdAt: string | null;
}

export interface DbSubmissionFeed {
  status: SubmissionStatus;
  metadata: string | null; // JSON string
}

export interface DbQueryResult {
  s: DbSubmission;
  m: DbModeration | null;
}

export interface DbFeedQueryResult extends Omit<DbQueryResult, 'm'> {
  sf: DbSubmissionFeed;
  m: DbModeration | null;
}

// Helper types for working with submission data/metadata
export interface SubmissionData {
  [key: string]: any; // Type-specific content data
}

export interface SubmissionMetadata {
  type: string;
  [key: string]: any; // Type-specific metadata
}

// Helper functions for type safety
export function parseSubmissionData(json: string): SubmissionData {
  return JSON.parse(json) as SubmissionData;
}

export function parseSubmissionMetadata(json: string): SubmissionMetadata {
  return JSON.parse(json) as SubmissionMetadata;
}
