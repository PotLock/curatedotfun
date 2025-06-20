import { useApiQuery } from "../../hooks/api-client";
import { useAuth } from "../../contexts/auth-context";

interface CanModerateResponse {
  canModerate: boolean;
  reason?: string;
  error?: string;
}

/**
 * Hook to check if the current authenticated user can moderate a specific feed.
 * @param feedId The ID of the feed to check. If undefined, the query will not run.
 * @returns Query result including `canModerate` boolean.
 */
export const useCanModerateFeed = (feedId: string | undefined) => {
  const { isSignedIn, currentAccountId } = useAuth();

  const enabled = !!feedId && isSignedIn && !!currentAccountId;

  return useApiQuery<CanModerateResponse>(
    ["can-moderate", feedId, currentAccountId],
    `/feeds/${feedId}/can-moderate`,
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
};
