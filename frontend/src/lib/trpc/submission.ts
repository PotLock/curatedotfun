import type { SubmissionWithFeedData } from "@curatedotfun/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PaginatedResponse } from "./feeds";
import { useTRPC } from "./index";

export function useAllSubmissions(limit: number = 20, status?: string) {
  const trpc = useTRPC();
  const queryOptions = trpc.submission.getAllSubmissions.infiniteQueryOptions(
    { limit, status },
    {
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage.pagination) return undefined;
        return lastPage.pagination.hasNextPage
          ? lastPage.pagination.page + 1
          : undefined;
      },
    }
  );

  return useInfiniteQuery({
    ...queryOptions,
    select: (data) => {
      const pagesTyped = data.pages as PaginatedResponse<SubmissionWithFeedData>[];
      return {
        pages: pagesTyped,
        pageParams: data.pageParams,
        items: pagesTyped.flatMap((page) =>
          Array.isArray(page.items) ? page.items : [],
        ),
      };
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
