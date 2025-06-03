import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import type { FeedConfig } from "@curatedotfun/types";
import type { AppConfig } from "@/types/config";
import type {
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../types/twitter";
import { usernameSchema, UserProfile } from "./validation/user";

export type SortOrderType = "newest" | "oldest";
export type StatusFilterType = "all" | SubmissionStatus;

export const getApiTarget = () => {
  // switch (import.meta.env.PUBLIC_CURATEDOTFUN_API) {
  //   case "production":
  //     return "https://api.curate.fun";
  //   case "staging":
  //     return "https://api.staging.curate.fun";
  //   default: // development
  //     return "http://localhost:3000";
  // }
  return "";
};

// TODO: Implement a shared types package
export interface FeedDetails {
  id: string;
  name: string;
  description: string | null;
  config: FeedConfig;
  createdAt: string;
  updatedAt: string | null;
}

export function useFeed(feedId: string) {
  return useQuery<FeedDetails>({
    queryKey: ["feed-details", feedId],
    queryFn: async () => {
      const response = await fetch(`${getApiTarget()}/api/feeds/${feedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch feed details");
      }
      return response.json();
    },
  });
}

export async function createFeed(
  feed: Omit<FeedConfig, "id"> & { id: string },
  idToken: string,
) {
  // Create the proper structure expected by the backend
  if (!feed.id || !feed.name) {
    throw new Error("Feed must have id and name properties");
  }
  const feedData = {
    id: feed.id,
    name: feed.name,
    description: feed.description,
    config: feed, // Include the entire feed object as the config
  };

  return fetch(`${getApiTarget()}/api/feeds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },

    body: JSON.stringify(feedData),
  }).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Failed to create feed (HTTP ${response.status})`,
      );
    }

    return data;
  });
}

export async function updateFeed(
  feedId: string,
  // The config part of the body will be the full FeedConfig object
  // The backend's updateFeedSchema will validate this.
  // We send the whole config, not just partial updates to config.
  payload: { config: FeedConfig },
  idToken: string,
) {
  return fetch(`${getApiTarget()}/api/feeds/${feedId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload), // Send { config: { ... } }
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.error || `Failed to update feed (HTTP ${response.status})`,
      );
    }
    return data;
  });
}

export function useUpdateFeed(feedId: string) {
  const { web3auth } = useWeb3Auth();
  return useMutation({
    mutationFn: async (payload: { config: FeedConfig }) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();
      return updateFeed(feedId, payload, authResult.idToken);
    },
  });
}

export async function deleteFeedApi(feedId: string) {
  return fetch(`${getApiTarget()}/api/feeds/${feedId}`, {
    method: "DELETE",
    // headers: {
    //   Authorization: `Bearer ${idToken}`,
    // },
  }).then(async (response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({})); // Try to parse JSON, default to empty object on error
      throw new Error(
        data.error || `Failed to delete feed (HTTP ${response.status})`,
      );
    }
    // DELETE might not return a body or return a simple success message
    return { success: true, message: "Feed deleted successfully" };
  });
}

export function useDeleteFeed(feedId: string) {
  // const { web3auth } = useWeb3Auth();
  return useMutation({
    mutationFn: async () => {
      // if (!web3auth) throw new Error("Web3Auth not initialized");
      // const authResult = await web3auth.authenticateUser();
      return deleteFeedApi(feedId);
    },
  });
}

export function useCreateFeed() {
  const { web3auth } = useWeb3Auth();

  return useMutation({
    mutationFn: async (feed: Omit<FeedConfig, "id"> & { id: string }) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();
      return createFeed(feed, authResult.idToken);
    },
  });
}
export interface SubmissionFilters {
  limit?: number;
  status?: StatusFilterType;
  sortOrder?: SortOrderType;
  q?: string;
}

export const submissionSearchSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  sortOrder: z.enum(["newest", "oldest"]).optional(),
  q: z.string().optional(),
});

export function useFeedItems(feedId: string, filters: SubmissionFilters = {}) {
  const { limit = 20, status, sortOrder, q } = filters;
  return useInfiniteQuery<
    PaginatedResponse<SubmissionWithFeedData>,
    Error,
    TransformedInfiniteData<SubmissionWithFeedData>,
    [
      string,
      string,
      StatusFilterType | undefined,
      SortOrderType | undefined,
      string | undefined,
    ], // queryName, feedId, status, sortOrder, q
    number
  >({
    queryKey: ["feed-submissions-paginated", feedId, status, sortOrder, q],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      params.append("page", pageParam.toString());
      params.append("limit", limit.toString());
      if (status) params.append("status", status);
      if (sortOrder) params.append("sortOrder", sortOrder);
      if (q) params.append("q", q);

      const url = `${getApiTarget()}/api/submissions/feed/${feedId}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch feed submissions");
      }
      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      items: data.pages.flatMap((page) => (Array.isArray(page) ? page : [])),
    }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: feedId !== undefined,
  });
}

export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: ["app-config"],
    queryFn: async () => {
      const response = await fetch(`${getApiTarget()}/api/config`);
      if (!response.ok) {
        throw new Error("Failed to fetch app config");
      }
      return response.json();
    },
  });
}

export function useGetLastTweetId() {
  return useQuery<{ lastTweetId: string }>({
    queryKey: ["last-tweet-id"],
    queryFn: async () => {
      const response = await fetch(`${getApiTarget()}/api/twitter/last-tweet-id`);
      if (!response.ok) {
        throw new Error("Failed to fetch last tweet ID");
      }
      return response.json();
    },
  });
}

export function useUpdateLastTweetId() {
  return useMutation({
    mutationFn: async (tweetId: string) => {
      const response = await fetch(`${getApiTarget()}/api/twitter/last-tweet-id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update tweet ID");
      }

      return response.json();
    },
  });
}

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
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", timeRange, feedId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timeRange) params.append("timeRange", timeRange);
      if (feedId) params.append("feedId", feedId);
      if (limit !== undefined) params.append("limit", limit.toString());

      const queryString = params.toString();
      const url = `${getApiTarget()}/api/leaderboard${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
  });
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

// Define the return type of the transformed data
export interface TransformedInfiniteData<T> {
  pages: PaginatedResponse<T>[];
  pageParams: number[];
  items: T[];
}

// User profile types and functions
export type CreateUserProfilePayload = {
  username: z.infer<typeof usernameSchema>;
  near_public_key: string;
  name?: string | null;
  email?: string | null;
  idToken: string;
};

export function createUserProfile(payload: CreateUserProfilePayload) {
  const { idToken, ...body } = payload;

  return fetch(`${getApiTarget()}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  }).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Failed to create account (HTTP ${response.status})`,
      );
    }

    return data.profile as UserProfile;
  });
}

export function useCreateUserProfile() {
  const { web3auth } = useWeb3Auth();
  return useMutation({
    mutationFn: async (payload: Omit<CreateUserProfilePayload, "idToken">) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();
      return createUserProfile({ ...payload, idToken: authResult.idToken });
    },
  });
}

export function getCurrentUserProfile(idToken: string) {
  return fetch(`${getApiTarget()}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  }).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Failed to fetch user profile (HTTP ${response.status})`,
      );
    }

    return data.profile as UserProfile;
  });
}

export function useCurrentUserProfile(enabled = true) {
  const { web3auth } = useWeb3Auth();

  return useQuery<UserProfile>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();
      return getCurrentUserProfile(authResult.idToken);
    },
    enabled: enabled,
  });
}

export function useAllSubmissions(filters: SubmissionFilters = {}) {
  const { limit = 20, status, sortOrder, q } = filters;
  // Use infinite query for direct pagination from the backend
  return useInfiniteQuery<
    PaginatedResponse<SubmissionWithFeedData>,
    Error,
    TransformedInfiniteData<SubmissionWithFeedData>,
    [
      string,
      StatusFilterType | undefined,
      SortOrderType | undefined,
      string | undefined,
    ], // queryName, status, sortOrder, q
    number
  >({
    queryKey: ["all-submissions-paginated", status, sortOrder, q],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      params.append("page", pageParam.toString());
      params.append("limit", limit.toString());
      if (status) params.append("status", status);
      if (sortOrder) params.append("sortOrder", sortOrder);
      if (q) params.append("q", q);

      const url = `${getApiTarget()}/api/submissions?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      return response.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    // Transform the response to extract just the items for components that expect an array
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      items: data.pages.flatMap((page) =>
        Array.isArray(page.items) ? page.items : [],
      ),
    }),
    // Poll every 10 seconds
    refetchInterval: 10000,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Refetch when regaining network connection
    refetchOnReconnect: true,
  });
}

export interface GlobalActivityStats {
  approval_rate: number;
  total_approvals: number;
  total_submissions: number;
}

export function useGlobalActivityStats() {
  return useQuery<GlobalActivityStats>({
    queryKey: ["global-activity-stats"],
    queryFn: async () => {
      const response = await fetch(`${getApiTarget()}/api/activity/stats`);
      if (!response.ok) {
        throw new Error("Failed to fetch global activity stats");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

// Activity Types

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

export interface ListOfUserActivityStats {
  activities: UserActivityStats[];
}

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

// Activity Hooks
export interface AggregatedActivityStats {
  totalSubmissions: number;
  totalApprovals: number;
  totalRejections: number;
  approvalRate: number;
}

export function useMyActivity() {
  const { web3auth } = useWeb3Auth();

  return useQuery<AggregatedActivityStats>({
    queryKey: ["my-activity"],
    queryFn: async () => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();

      const response = await fetch(`${getApiTarget()}/api/activity/user/me`, {
        headers: {
          Authorization: `Bearer ${authResult.idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user activity");
      }

      const data: ListOfUserActivityStats = await response.json();

      // Calculate statistics from activities
      const stats = data.activities.reduce(
        (acc, activity) => {
          if (activity.type === ActivityType.CONTENT_SUBMISSION) {
            acc.totalSubmissions++;
          } else if (activity.type === ActivityType.CONTENT_APPROVAL) {
            acc.totalApprovals++;
          }
          return acc;
        },
        { totalSubmissions: 0, totalApprovals: 0 },
      );

      // Calculate rejections (submissions - approvals)
      const totalRejections = stats.totalSubmissions - stats.totalApprovals;

      // Calculate approval rate
      const approvalRate =
        stats.totalApprovals + totalRejections > 0
          ? stats.totalApprovals / (stats.totalApprovals + totalRejections)
          : 0;

      return {
        totalSubmissions: stats.totalSubmissions,
        totalApprovals: stats.totalApprovals,
        totalRejections,
        approvalRate,
      };
    },
    enabled: !!web3auth,
  });
}

export function useUserActivity(
  userId: string | number,
  options?: ActivityQueryOptions,
) {
  const params = new URLSearchParams();
  if (options?.timeRange) params.append("timeRange", options.timeRange);
  if (options?.feedId) params.append("feedId", options.feedId);

  const queryString = params.toString();

  return useQuery<UserActivityStats[]>({
    queryKey: ["user-activity", userId, options],
    queryFn: async () => {
      const url = `${getApiTarget()}/api/activity/user/${userId}${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch user activity");
      }

      const data = await response.json();

      return data.activities;
    },
  });
}

export function useMyCuratedFeeds() {
  const { web3auth } = useWeb3Auth();

  return useQuery<CuratedFeed[]>({
    queryKey: ["my-curated-feeds"],
    queryFn: async () => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();

      const response = await fetch(`${getApiTarget()}/api/activity/feeds/curated-by/me`, {
        headers: {
          Authorization: `Bearer ${authResult.idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch curated feeds");
      }

      const data = await response.json();

      return data.feeds;
    },
    enabled: !!web3auth,
  });
}

export function useMyApprovedFeeds() {
  const { web3auth } = useWeb3Auth();

  return useQuery<CuratedFeed[]>({
    queryKey: ["my-approved-feeds"],
    queryFn: async () => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();

      const response = await fetch(`${getApiTarget()}/api/activity/feeds/approved-by/me`, {
        headers: {
          Authorization: `Bearer ${authResult.idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch approved feeds");
      }

      const data = await response.json();

      return data.feeds;
    },
    enabled: !!web3auth,
  });
}

export function useMyFeedRank(feedId: string) {
  const { web3auth } = useWeb3Auth();

  return useQuery<FeedRank>({
    queryKey: ["my-feed-rank", feedId],
    queryFn: async () => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      const authResult = await web3auth.authenticateUser();

      const response = await fetch(`${getApiTarget()}/api/activity/feeds/${feedId}/my-rank`, {
        headers: {
          Authorization: `Bearer ${authResult.idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch feed rank");
      }

      return response.json();
    },
    enabled: !!web3auth,
  });
}
