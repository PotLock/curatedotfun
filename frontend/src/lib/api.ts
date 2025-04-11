import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { AppConfig, FeedConfig } from "../types/config";
import type { SubmissionWithFeedData } from "../types/twitter";

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

export function useFeedItems(feedId: string) {
  return useQuery<SubmissionWithFeedData[]>({
    queryKey: ["feed-items", feedId],
    queryFn: async () => {
      const response = await fetch(`/api/feed/${feedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch feed items");
      }
      return response.json();
    },
    // Poll every 10 seconds
    refetchInterval: 10000,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Refetch when regaining network connection
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

export function useLeaderboard(timeRange?: string) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", timeRange],
    queryFn: async () => {
      const url = timeRange
        ? `/api/leaderboard?timeRange=${timeRange}`
        : "/api/leaderboard";
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
      // Use the pagination metadata to determine if there's a next page
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    // Transform the response to extract just the items for components that expect an array
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Add a flattened items array for easier access
      items: data.pages.flatMap((page) => page.items),
    }),
    // Poll every 10 seconds
    refetchInterval: 10000,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Refetch when regaining network connection
    refetchOnReconnect: true,
  });
}
