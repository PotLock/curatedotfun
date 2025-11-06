import { useApiQuery } from "../../hooks/api-client";

export interface FeedSubmissionCount {
  feedId: string;
  count: number;
  totalInFeed: number;
}

export interface LeaderboardEntry {
  curatorId: string;
  curatorUsername: string;
  submissionCount: number;
  approvalCount: number;
  rejectionCount: number;
  feedSubmissions: FeedSubmissionCount[];
}

export function useLeaderboard(
  timeRange?: string,
  feedId?: string,
  limit?: number,
) {
  const params = new URLSearchParams();
  if (timeRange) params.append("timeRange", timeRange);
  if (feedId) params.append("feedId", feedId);
  if (limit !== undefined) params.append("limit", limit.toString());
  const queryString = params.toString();
  const path = `/leaderboard${queryString ? `?${queryString}` : ""}`;

  return useApiQuery<LeaderboardEntry[]>(
    ["leaderboard", timeRange, feedId, limit],
    path,
  );
}
