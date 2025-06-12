import { useApiQuery } from "../../hooks/api-client";

// Types from the old api.ts
export const ActivityType = {
  CONTENT_SUBMISSION: "CONTENT_SUBMISSION",
  CONTENT_APPROVAL: "CONTENT_APPROVAL",
  TOKEN_BUY: "TOKEN_BUY",
  TOKEN_SELL: "TOKEN_SELL",
  POINTS_REDEMPTION: "POINTS_REDEMPTION",
  POINTS_AWARDED: "POINTS_AWARDED",
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export interface UserActivityStats {
  type: ActivityType;
  feed_id: string | null;
  user_id: number;
  id: number;
  data: unknown;
  metadata: unknown | null;
  createdAt: Date;
  updatedAt: Date | null;
  timestamp: Date;
  submission_id: string | null;
}

// This type might not be directly used if useApiQuery returns UserActivityStats[] directly
// export interface ListOfUserActivityStats {
//   activities: UserActivityStats[];
// }

export interface ActivityQueryOptions {
  timeRange?: string;
  feedId?: string;
}

export interface CuratedFeed {
  feed_id: string;
  feed_name: string | null;
  submissions_count: number;
  curator_rank: number | null;
  points: number;
  data: unknown;
  metadata: unknown | null;
}

export interface FeedRank {
  curatorRank: number | null;
  approverRank: number | null;
}

export interface GlobalActivityStats {
  approval_rate: number;
  total_approvals: number;
  total_submissions: number;
}

export interface AggregatedActivityStats {
  totalSubmissions: number;
  totalApprovals: number;
  totalRejections: number;
  approvalRate: number;
}
// End of copied types

export function useGlobalActivityStats() {
  return useApiQuery<GlobalActivityStats>(
    ["global-activity-stats"],
    `/activity/stats`,
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );
}

export function useMyActivity() {
  return useApiQuery<AggregatedActivityStats>(
    ["my-activity"],
    `/activity/user/me`
    // { enabled: isLoggedIn } // This would require useAuth here or passing enabled status
  );
}

export function useUserActivity(
  userId: string | number,
  options?: ActivityQueryOptions,
) {
  const params = new URLSearchParams();
  if (options?.timeRange) params.append("timeRange", options.timeRange);
  if (options?.feedId) params.append("feedId", options.feedId);
  const queryString = params.toString();
  const path = `/activity/user/${userId}${queryString ? `?${queryString}` : ""}`;

  // Assuming the API returns an object like { activities: UserActivityStats[] }
  // and we want to extract the 'activities' array.
  return useApiQuery<{ activities: UserActivityStats[] }, Error, UserActivityStats[]>(
    ["user-activity", userId, options],
    path,
    {
      select: (data) => data.activities,
      // enabled: !!userId // Or other conditions
    }
  );
}

export function useMyCuratedFeeds() {
  return useApiQuery<CuratedFeed[]>(
    ["my-curated-feeds"],
    `/activity/feeds/curated-by/me`
    // { enabled: isLoggedIn }
  );
}

export function useMyApprovedFeeds() {
  return useApiQuery<CuratedFeed[]>(
    ["my-approved-feeds"],
    `/activity/feeds/approved-by/me`
    // { enabled: isLoggedIn }
  );
}

export function useMyFeedRank(feedId: string) {
  return useApiQuery<FeedRank>(
    ["my-feed-rank", feedId],
    `/activity/feeds/${feedId}/my-rank`,
    { enabled: !!feedId }
  );
}
