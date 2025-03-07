import { useMutation, useQuery } from "@tanstack/react-query";
import type { AppConfig, FeedConfig } from "../types/config";
import type { TwitterSubmissionWithFeedData } from "../types/twitter";

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
  return useQuery<TwitterSubmissionWithFeedData[]>({
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
  feedSubmissions: FeedSubmissionCount[];
}

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard");
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
  });
}
