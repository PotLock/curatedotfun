import type {
  CanModerateResponse,
  CreateFeedRequest,
  FeedContextSubmission,
  FeedResponse,
  FeedsWrappedResponse,
  FeedWrappedResponse,
  UpdateFeedRequest,
} from "@curatedotfun/types";
import { useAuth } from "../../contexts/auth-context";
import {
  useApiInfiniteQuery,
  useApiMutation,
  useApiQuery,
} from "../../hooks/api-client";
import type {
  PaginatedResponse,
  SortOrderType,
  StatusFilterType,
  SubmissionFilters,
  TransformedInfiniteData,
} from "./types";

export function useFeed(feedId: string) {
  return useApiQuery<FeedWrappedResponse, Error, FeedResponse | undefined>(
    ["feed-details", feedId],
    `/feeds/${feedId}`,
    {
      enabled: !!feedId,
      select: (data) => data.data,
    },
  );
}

export function useAllFeeds() {
  return useApiQuery<FeedsWrappedResponse, Error, FeedResponse[]>(
    ["feeds"],
    `/feeds`,
    {
      select: (data) => data.data ?? [],
    },
  );
}

// Hook to get feeds created by the current user
export function useMyCreatedFeeds() {
  const { isSignedIn, currentAccountId } = useAuth();
  return useApiQuery<FeedsWrappedResponse, Error, FeedResponse[]>(
    ["my-created-feeds", currentAccountId],
    `/feeds`,
    {
      enabled: isSignedIn && !!currentAccountId,
      select: (data) => {
        const feeds = data.data ?? [];
        return feeds.filter((feed) => feed.created_by === currentAccountId);
      },
    },
  );
}

export function useCreateFeed() {
  return useApiMutation<FeedResponse, Error, CreateFeedRequest>(
    {
      method: "POST",
      path: `/feeds`,
      message: "createFeed",
    },
    {
      // onSuccess logic can be added here if needed, using queryClient from useQueryClient()
    },
  );
}

export function useUpdateFeed(feedId: string) {
  return useApiMutation<FeedResponse, Error, UpdateFeedRequest>(
    {
      method: "PUT",
      path: `/feeds/${feedId}`,
      message: "updateFeed",
    },
    {
      // onSuccess logic
    },
  );
}

interface DeleteFeedResponse {
  success: boolean;
  message?: string;
}
export function useDeleteFeed(feedId: string) {
  return useApiMutation<DeleteFeedResponse, Error, void>(
    {
      method: "DELETE",
      path: `/feeds/${feedId}`,
      message: "deleteFeed",
    },
    {
      // onSuccess logic
    },
  );
}

export function useFeedItems(feedId: string, filters: SubmissionFilters = {}) {
  const { limit = 20, status, sortOrder, q } = filters;

  const pathFn = (pageParam: number) => {
    const params = new URLSearchParams();
    params.append("page", pageParam.toString());
    params.append("limit", limit.toString());
    if (status) params.append("status", status);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (q) params.append("q", q);
    // Note: The path for useApiInfiniteQuery should NOT start with /api
    return `/submissions/feed/${feedId}?${params.toString()}`;
  };

  const queryResult = useApiInfiniteQuery<
    PaginatedResponse<FeedContextSubmission>,
    Error,
    TransformedInfiniteData<FeedContextSubmission>,
    [
      string,
      string,
      StatusFilterType | undefined,
      SortOrderType | undefined,
      string | undefined,
    ], // TQueryKey
    number // TPageParam
  >(["feed-submissions-paginated", feedId, status, sortOrder, q], pathFn, {
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.pagination) return undefined;
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams as number[],
      items: data.pages.flatMap((page) =>
        Array.isArray(page.items) ? page.items : [],
      ),
    }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!feedId,
  });

  return queryResult;
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

// Hook to get feed content count (approved submissions)
export function useFeedContentCount(feedId: string) {
  return useApiQuery<PaginatedResponse<FeedContextSubmission>, Error, number>(
    ["feed-content-count", feedId],
    `/submissions/feed/${feedId}?page=0&limit=1&status=approved`,
    {
      enabled: !!feedId,
      select: (data) => data.pagination?.totalCount || 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}

// Hook to get basic feed stats
export function useFeedStats(feedId: string) {
  const contentCountQuery = useFeedContentCount(feedId);
  
  return {
    contentCount: contentCountQuery.data ?? 0,
    curatorCount: 0, // TODO: Need new API endpoint: GET /api/feeds/:feedId/stats with curator count
    isLoading: contentCountQuery.isLoading,
    error: contentCountQuery.error,
  };
}
