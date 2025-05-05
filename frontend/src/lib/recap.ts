import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RecapConfig } from "../types/recap";

// Type for recap with state information
export interface RecapWithState extends RecapConfig {
  state?: {
    lastSuccessfulCompletion?: string;
    lastRunError?: string;
  } | null;
}

// Response type for getting all recaps
export interface GetRecapsResponse {
  recaps: RecapWithState[];
}

// Response type for getting a single recap
export interface GetRecapResponse {
  recap: RecapWithState;
}

/**
 * Hook to fetch all recap configurations for a feed
 */
export function useRecaps(feedId: string) {
  return useQuery<GetRecapsResponse>({
    queryKey: ["recaps", feedId],
    queryFn: async () => {
      const response = await fetch(`/api/feed/${feedId}/recap`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to fetch recap configurations",
        );
      }
      return response.json();
    },
  });
}

/**
 * Hook to fetch a specific recap configuration
 */
export function useRecap(feedId: string, recapIndex: number) {
  return useQuery<GetRecapResponse>({
    queryKey: ["recap", feedId, recapIndex],
    queryFn: async () => {
      const response = await fetch(`/api/feed/${feedId}/recap/${recapIndex}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to fetch recap configuration",
        );
      }
      return response.json();
    },
  });
}

/**
 * Hook to add a new recap configuration
 */
export function useAddRecap(feedId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recapConfig: RecapConfig) => {
      const response = await fetch(`/api/feed/${feedId}/recap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recapConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add recap configuration");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the recaps query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["recaps", feedId] });
      // Also invalidate the feed config since it contains the recap configs
      queryClient.invalidateQueries({ queryKey: ["feed", feedId] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
}

/**
 * Hook to update a recap configuration
 */
export function useUpdateRecap(feedId: string, recapIndex: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recapConfig: RecapConfig) => {
      const response = await fetch(`/api/feed/${feedId}/recap/${recapIndex}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recapConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update recap configuration",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the recaps query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["recaps", feedId] });
      // Invalidate the specific recap query
      queryClient.invalidateQueries({
        queryKey: ["recap", feedId, recapIndex],
      });
      // Also invalidate the feed config since it contains the recap configs
      queryClient.invalidateQueries({ queryKey: ["feed", feedId] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
}

/**
 * Hook to delete a recap configuration
 */
export function useDeleteRecap(feedId: string, recapIndex: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/feed/${feedId}/recap/${recapIndex}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to delete recap configuration",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the recaps query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["recaps", feedId] });
      // Also invalidate the feed config since it contains the recap configs
      queryClient.invalidateQueries({ queryKey: ["feed", feedId] });
      queryClient.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
}

/**
 * Hook to manually trigger a recap job
 */
export function useRunRecap(feedId: string, recapIndex: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/feed/${feedId}/recap/${recapIndex}/run`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to run recap job");
      }

      return response.json();
    },
    onSuccess: () => {
      // After a short delay, invalidate the recap query to show updated state
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["recap", feedId, recapIndex],
        });
        queryClient.invalidateQueries({ queryKey: ["recaps", feedId] });
      }, 2000);
    },
  });
}
