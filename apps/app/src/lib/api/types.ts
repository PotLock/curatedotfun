import type { SubmissionStatus } from "@curatedotfun/types";
import { z } from "zod";

export type SortOrderType = "newest" | "oldest";
export type StatusFilterType = "all" | SubmissionStatus;

export interface SubmissionFilters {
  limit?: number;
  status?: StatusFilterType;
  sortOrder?: SortOrderType;
  q?: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface TransformedInfiniteData<T> {
  pages: PaginatedResponse<T>[];
  pageParams: number[];
  items: T[];
}

export const submissionSearchSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  sortOrder: z.enum(["newest", "oldest"]).optional(),
  q: z.string().optional(),
});
