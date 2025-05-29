import type { InsertFeed, SubmissionWithFeedData } from "@curatedotfun/types";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useWeb3Auth } from "../../hooks/use-web3-auth";
import { useTRPC, useTRPCClient } from "./index";

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

export interface TransformedInfiniteData<T> {
  pages: PaginatedResponse<T>[];
  pageParams: (number | null | undefined)[];
  items: T[];
}

export function useFeed(feedId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.feeds.getFeedById.queryOptions({ feedId }));
}

export function useCreateFeed() {
  const client = useTRPCClient();
  const { web3auth } = useWeb3Auth();

  return useMutation({
    mutationFn: async (variables: InsertFeed) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      await web3auth.authenticateUser();
      return client.feeds.createFeed.mutate(variables);
    },
  });
}

export function useFeedItems(
  feedId: string,
  limit: number = 20,
  status?: string,
) {
  const trpc = useTRPC();
  const queryOptions = trpc.submission.getSubmissionsByFeed.infiniteQueryOptions(
    { feedId, limit, status },
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
