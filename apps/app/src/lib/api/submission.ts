import type { Submission } from "@curatedotfun/types";
import { useApiInfiniteQuery } from "../../hooks/api-client";
import type {
  SortOrderType,
  StatusFilterType,
  SubmissionFilters,
  PaginatedResponse,
  TransformedInfiniteData,
} from "./types";

export function useAllSubmissions(filters: SubmissionFilters = {}) {
  const { limit = 20, status, sortOrder, q } = filters;

  const pathFn = (pageParam: number) => {
    const params = new URLSearchParams();
    params.append("page", pageParam.toString());
    params.append("limit", limit.toString());
    if (status) params.append("status", status);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (q) params.append("q", q);
    return `/submissions?${params.toString()}`;
  };

  return useApiInfiniteQuery<
    PaginatedResponse<Submission>, // TQueryFnData
    Error, // TError
    TransformedInfiniteData<Submission>, // TData
    [
      string,
      StatusFilterType | undefined,
      SortOrderType | undefined,
      string | undefined,
    ], // TQueryKey
    number // TPageParam
  >(["all-submissions-paginated", status, sortOrder, q], pathFn, {
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
  });
}
