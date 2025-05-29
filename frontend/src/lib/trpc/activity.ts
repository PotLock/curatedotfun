import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useTRPC } from "../trpc";

export function useGlobalActivityStats() {
  const trpc = useTRPC();
  return useQuery(
    trpc.activity.getGlobalStats.queryOptions(undefined, {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }),
  );
}

export function useLeaderboard() {
  const trpc = useTRPC();
  return useQuery(
    trpc.activity.getLeaderboard.queryOptions(undefined, {
      select: (data) => data.leaderboard,
    }),
  );
}

export function useMyActivities() {
  const trpc = useTRPC();
  const { isLoggedIn } = useAuth();
  return useQuery(
    trpc.activity.getMyActivities.queryOptions(undefined, {
      enabled: isLoggedIn
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

export function useMyCuratedFeeds() {
  const trpc = useTRPC();
  const { isLoggedIn } = useAuth();
  return useQuery(
    trpc.activity.getMyCuratedFeeds.queryOptions(undefined, {
      enabled: isLoggedIn
    }),
  );
}

export function useMyApprovedFeeds() {
  const trpc = useTRPC();
  const { isLoggedIn } = useAuth();
  return useQuery(
    trpc.activity.getMyApprovedFeeds.queryOptions(undefined, {
      enabled: isLoggedIn
    }),
  );
}

export function useMyFeedRank(
  input: GetMyFeedRankInput,
) {
  const trpc = useTRPC();
  const { isLoggedIn } = useAuth();
  return useQuery(
    trpc.activity.getMyFeedRank.queryOptions(input, {
      enabled: isLoggedIn
    }),
  );
}
