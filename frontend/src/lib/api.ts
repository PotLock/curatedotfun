import { useQuery, useMutation } from "@tanstack/react-query";
import type { FeedConfig, AppConfig, TwitterSubmissionWithFeedData } from "@curatedotfun/types";

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

export function useClearCookies() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/clear-cookies", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to clear cookies");
      }

      return response.json();
    },
  });
}

export function useUpdateLastTweetId() {
  return useMutation({
    mutationFn: async (tweetId: string) => {
      const response = await fetch("/api/last-tweet-id", {
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
