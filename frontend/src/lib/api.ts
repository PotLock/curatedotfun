import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import type { AppConfig, FeedConfig } from "../types/config";
import type { SubmissionWithFeedData } from "../types/twitter";
import { usernameSchema, UserProfile } from "./validation/user";

export function useFeedConfig(feedId: string) {
  return useQuery<FeedConfig>({
    queryKey: ["feed", feedId],
    queryFn: async () => {
      const response = await fetch(`/api/config/${feedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch feed config");
      }
      return response.json();
    },
  });
}

export function useFeedItems(
  feedId: string,
  limit: number = 20,
  status?: string,
) {
  return useInfiniteQuery<
    PaginatedResponse<SubmissionWithFeedData>,
    Error,
    TransformedInfiniteData<SubmissionWithFeedData>,
    [string, string, string | undefined],
    number
  >({
    queryKey: ["feed-items-paginated", feedId, status],
    queryFn: async ({ pageParam = 0 }) => {
      const statusParam = status ? `status=${status}` : "";
      const pageParamStr = `page=${pageParam}`;
      const limitParam = `limit=${limit}`;

      // Build query string with available parameters
      const queryParams = [statusParam, pageParamStr, limitParam]
        .filter((param) => param !== "")
        .join("&");

      const url = `/api/feed/${feedId}?${queryParams}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch feed items");
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
  });
}

export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: ["app-config"],
    queryFn: async () => {
      const response = await fetch("/api/config");
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
      const response = await fetch("/api/twitter/last-tweet-id");
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
      const response = await fetch("/api/twitter/last-tweet-id", {
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
      if (feedId) params.append("feed_id", feedId);
      if (limit !== undefined) params.append("limit", limit.toString());

      const queryString = params.toString();
      const url = `/api/leaderboard${queryString ? `?${queryString}` : ""}`;
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

  return fetch("/api/users", {
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
  return fetch("/api/users/me", {
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

export function useAllSubmissions(limit: number = 20, status?: string) {
  // Use infinite query for direct pagination from the backend
  return useInfiniteQuery<
    PaginatedResponse<SubmissionWithFeedData>,
    Error,
    TransformedInfiniteData<SubmissionWithFeedData>,
    [string, string | undefined],
    number
  >({
    queryKey: ["all-submissions-paginated", status],
    queryFn: async ({ pageParam = 0 }) => {
      const statusParam = status ? `status=${status}` : "";
      const pageParamStr = `page=${pageParam}`;
      const limitParam = `limit=${limit}`;

      // Build query string with available parameters
      const queryParams = [statusParam, pageParamStr, limitParam]
        .filter((param) => param !== "")
        .join("&");

      const url = `/api/submissions${queryParams ? `?${queryParams}` : ""}`;

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
