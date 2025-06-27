import {
  FeedResponse,
  FeedsWrappedResponse,
  UserProfile,
} from "@curatedotfun/types";
import { useApiQuery } from "../../hooks/api-client";

export function useCurrentUserProfile(enabled = true) {
  return useApiQuery<UserProfile | null>(["currentUserProfile"], `/users/me`, {
    enabled,
  });
}

export function useGetUserByNearAccountId(
  nearAccountId: string | null,
  options?: { enabled?: boolean; retry?: boolean | number },
) {
  return useApiQuery<UserProfile | null>(
    ["userByNearAccountId", nearAccountId],
    `/users/by-near/${nearAccountId}`,
    {
      enabled:
        options?.enabled !== undefined
          ? options.enabled && !!nearAccountId
          : !!nearAccountId,
      retry: options?.retry === undefined ? 1 : options.retry,
    },
  );
}

export function useUserFeeds(nearAccountId?: string | null) {
  return useApiQuery<FeedsWrappedResponse, Error, FeedResponse[]>(
    ["user-feeds", nearAccountId],
    `/users/${nearAccountId}/feeds`,
    {
      enabled: !!nearAccountId,
      select: (data) => data.data ?? [],
    },
  );
}
