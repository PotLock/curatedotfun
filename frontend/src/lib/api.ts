import {
  useGlobalActivityStats,
  useLeaderboard,
  useMyActivities,
  useMyApprovedFeeds,
  useMyCuratedFeeds,
  useMyFeedRank,
  useUserActivities,
} from "./trpc/activity";
import { useAppConfig } from "./trpc/config";
import { useCreateFeed, useFeed, useFeedItems } from "./trpc/feeds";
import { useAllSubmissions } from "./trpc/submission";
import { useCreateUserProfile, useCurrentUserProfile } from "./trpc/users";
export {
  useAllSubmissions, useAppConfig, useCreateFeed, useCreateUserProfile,
  useCurrentUserProfile, useFeed, useFeedItems, useGlobalActivityStats,
  useLeaderboard,
  useMyActivities,
  useMyApprovedFeeds,
  useMyCuratedFeeds,
  useMyFeedRank,
  useUserActivities
};

