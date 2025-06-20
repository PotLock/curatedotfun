import {
  Activity,
  ActivityListResponse,
  FeedInfo,
  FeedInfoListResponse,
  GetUserActivitiesApiQuery,
  GlobalStats,
  GlobalStatsResponse,
  UserFeedRankResponse,
  UserFeedRanks,
} from "@curatedotfun/types";
import { useAuth } from "../../contexts/auth-context";
import { useApiQuery } from "../../hooks/api-client";

export function useGlobalActivityStats() {
  return useApiQuery<GlobalStatsResponse, Error, GlobalStats>(
    ["global-activity-stats"],
    `/activity/stats`,
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      select: (response) => response.data as GlobalStats,
    },
  );
}

export function useMyActivity() {
  const { isSignedIn } = useAuth();
  return useApiQuery<ActivityListResponse, Error, Activity[]>(
    ["my-activity"],
    `/activity/user/me`,
    {
      enabled: isSignedIn,
      select: (response) => response.data as Activity[],
    },
  );
}

export function useUserActivity(
  userId: string | number,
  options?: Partial<GetUserActivitiesApiQuery>,
) {
  const params = new URLSearchParams();

  if (options?.types)
    params.append(
      "types",
      Array.isArray(options.types) ? options.types.join(",") : options.types,
    );
  if (options?.feed_id) params.append("feed_id", options.feed_id);
  if (options?.from_date) params.append("from_date", options.from_date);
  if (options?.to_date) params.append("to_date", options.to_date);

  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  if (options?.sortBy) params.append("sortBy", options.sortBy);
  if (options?.sortOrder) params.append("sortOrder", options.sortOrder);

  const queryString = params.toString();
  const path = `/activity/user/${userId}${queryString ? `?${queryString}` : ""}`;

  return useApiQuery<ActivityListResponse, Error, Activity[]>(
    ["user-activity", userId, options],
    path,
    {
      enabled: !!userId,
      select: (response) => response.data as Activity[],
    },
  );
}

export function useMyCuratedFeeds() {
  const { isSignedIn } = useAuth();
  return useApiQuery<FeedInfoListResponse, Error, FeedInfo[]>(
    ["my-curated-feeds"],
    `/activity/feeds/curated-by/me`,
    {
      enabled: isSignedIn,
      select: (response) => response.data as FeedInfo[],
    },
  );
}

export function useMyApprovedFeeds() {
  const { isSignedIn } = useAuth();
  return useApiQuery<FeedInfoListResponse, Error, FeedInfo[]>(
    ["my-approved-feeds"],
    `/activity/feeds/approved-by/me`,
    {
      enabled: isSignedIn,
      select: (response) => response.data as FeedInfo[],
    },
  );
}

export function useMyFeedRank(feedId: string) {
  return useApiQuery<UserFeedRankResponse, Error, UserFeedRanks>(
    ["my-feed-rank", feedId],
    `/activity/feeds/${feedId}/my-rank`,
    {
      enabled: !!feedId,
      select: (response) => response.data as UserFeedRanks,
    },
  );
}
