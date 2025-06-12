import type { FeedConfig, Submission } from "@curatedotfun/types";
import { useApiQuery, useApiMutation, useApiInfiniteQuery } from "../../hooks/api-client";
import type {
  SortOrderType,
  StatusFilterType,
  SubmissionFilters,
  PaginatedResponse,
  TransformedInfiniteData,
} from "./types";

export interface FeedDetails {
  id: string;
  name: string;
  description: string | null;
  config: FeedConfig;
  createdAt: string;
  updatedAt: string | null;
}

export function useFeed(feedId: string) {
  return useApiQuery<FeedDetails>(
    ["feed-details", feedId],
    `/feeds/${feedId}`,
    { enabled: !!feedId },
  );
}

export function useAllFeeds() {
  return useApiQuery<FeedDetails[]>(
    ["feeds"],
    `/feeds`,
  );
}

export function useCreateFeed() {
  type CreateFeedVariables = Omit<FeedConfig, "id"> & { id: string; name: string; description?: string | null };
  return useApiMutation<FeedDetails, Error, CreateFeedVariables>(
    {
      method: 'POST',
      path: `/feeds`,
      message: "createFeed",
    },
    {
      // onSuccess logic can be added here if needed, using queryClient from useQueryClient()
    }
  );
}

export function useUpdateFeed(feedId: string) {
  type UpdateFeedVariables = { config: FeedConfig };
  return useApiMutation<FeedDetails, Error, UpdateFeedVariables>(
    {
      method: 'PUT',
      path: `/feeds/${feedId}`,
      message: "updateFeed",
    },
    {
      // onSuccess logic
    }
  );
}

interface DeleteFeedResponse {
  success: boolean;
  message?: string;
}
export function useDeleteFeed(feedId: string) {
  return useApiMutation<DeleteFeedResponse, Error, void>(
    {
      method: 'DELETE',
      path: `/feeds/${feedId}`,
      message: "deleteFeed",
    },
    {
      // onSuccess logic
    }
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

  return useApiInfiniteQuery<
    PaginatedResponse<Submission>, // TQueryFnData: data type per page
    Error,                         // TError
    TransformedInfiniteData<Submission>, // TData: type of combined data
    [string, string, StatusFilterType | undefined, SortOrderType | undefined, string | undefined], // TQueryKey
    number                         // TPageParam
  >(
    ["feed-submissions-paginated", feedId, status, sortOrder, q],
    pathFn,
    {
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage.pagination) return undefined;
        return lastPage.pagination.hasNextPage
          ? lastPage.pagination.page + 1
          : undefined;
      },
      select: (data) => ({
        pages: data.pages,
        pageParams: data.pageParams as number[], // Ensure pageParams is number[]
        items: data.pages.flatMap((page) =>
          Array.isArray(page.items) ? page.items : [],
        ),
      }),
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      enabled: !!feedId,
    }
  );
}
