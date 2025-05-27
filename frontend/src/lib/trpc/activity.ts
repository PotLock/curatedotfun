import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTRPC } from "../trpc";
import { z } from "zod";
import type {
  getGlobalStatsDefinition,
  getLeaderboardDefinition,
  getMyActivitiesDefinition,
  getUserActivitiesDefinition,
  getMyCuratedFeedsDefinition,
  getMyApprovedFeedsDefinition,
  getMyFeedRankDefinition,
} from "@curatedotfun/api-contract";
import { useWeb3Auth } from "../../hooks/use-web3-auth";

type GetGlobalStatsOutput = z.infer<typeof getGlobalStatsDefinition.output>;
type GetLeaderboardInput = z.infer<typeof getLeaderboardDefinition.input>;
type GetLeaderboardOutput = z.infer<typeof getLeaderboardDefinition.output>;
type GetMyActivitiesInput = z.infer<typeof getMyActivitiesDefinition.input>;
type GetMyActivitiesOutput = z.infer<typeof getMyActivitiesDefinition.output>;
type GetUserActivitiesInput = z.infer<typeof getUserActivitiesDefinition.input>;
type GetUserActivitiesOutput = z.infer<
  typeof getUserActivitiesDefinition.output
>;
type GetMyCuratedFeedsOutput = z.infer<
  typeof getMyCuratedFeedsDefinition.output
>;
type GetMyApprovedFeedsOutput = z.infer<
  typeof getMyApprovedFeedsDefinition.output
>;
type GetMyFeedRankInput = z.infer<typeof getMyFeedRankDefinition.input>;
type GetMyFeedRankOutput = z.infer<typeof getMyFeedRankDefinition.output>;

export function useGlobalActivityStats(
  options?: Omit<UseQueryOptions<GetGlobalStatsOutput>, "queryKey" | "queryFn">,
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.activity.getGlobalStats.queryOptions(undefined, {
      ...options,
      refetchInterval: options?.refetchInterval ?? 30000,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
      refetchOnReconnect: options?.refetchOnReconnect ?? true,
    }),
  );
}

export function useLeaderboard(
  input: GetLeaderboardInput,
  options?: Omit<UseQueryOptions<GetLeaderboardOutput>, "queryKey" | "queryFn">,
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.activity.getLeaderboard.queryOptions(input, {
      ...options,
      select:
        options?.select ?? ((data: GetLeaderboardOutput) => data.leaderboard),
    }),
  );
}

export function useMyActivities(
  input: GetMyActivitiesInput,
  options?: Omit<
    UseQueryOptions<GetMyActivitiesOutput>,
    "queryKey" | "queryFn"
  >,
) {
  const trpc = useTRPC();
  const { web3auth } = useWeb3Auth();
  return useQuery(
    trpc.activity.getMyActivities.queryOptions(input, {
      ...options,
      enabled:
        !!web3auth && (options?.enabled !== undefined ? options.enabled : true),
    }),
  );
}

export function useUserActivities(
  input: GetUserActivitiesInput,
  options?: Omit<
    UseQueryOptions<GetUserActivitiesOutput>,
    "queryKey" | "queryFn"
  >,
) {
  const trpc = useTRPC();
  return useQuery(trpc.activity.getUserActivities.queryOptions(input, options));
}

export function useMyCuratedFeeds(
  options?: Omit<
    UseQueryOptions<GetMyCuratedFeedsOutput>,
    "queryKey" | "queryFn"
  >,
) {
  const trpc = useTRPC();
  const { web3auth } = useWeb3Auth();
  return useQuery(
    trpc.activity.getMyCuratedFeeds.queryOptions(undefined, {
      ...options,
      enabled:
        !!web3auth && (options?.enabled !== undefined ? options.enabled : true),
    }),
  );
}

export function useMyApprovedFeeds(
  options?: Omit<
    UseQueryOptions<GetMyApprovedFeedsOutput>,
    "queryKey" | "queryFn"
  >,
) {
  const trpc = useTRPC();
  const { web3auth } = useWeb3Auth();
  return useQuery(
    trpc.activity.getMyApprovedFeeds.queryOptions(undefined, {
      ...options,
      enabled:
        !!web3auth && (options?.enabled !== undefined ? options.enabled : true),
    }),
  );
}

export function useMyFeedRank(
  input: GetMyFeedRankInput,
  options?: Omit<UseQueryOptions<GetMyFeedRankOutput>, "queryKey" | "queryFn">,
) {
  const trpc = useTRPC();
  const { web3auth } = useWeb3Auth();
  return useQuery(
    trpc.activity.getMyFeedRank.queryOptions(input, {
      ...options,
      enabled:
        !!web3auth && (options?.enabled !== undefined ? options.enabled : true),
    }),
  );
}
