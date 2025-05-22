import { InsertActivity, SelectFeedUserStats, SelectUserStats, UpdateFeedUserStats, UpdateUserStats } from "services/db/types";
import {
  ActivityQueryOptions,
  GlobalStats,
  LeaderboardQueryOptions
} from "../../validation/activity.validation";
import { LeaderboardEntry } from "services/db/queries";

export interface IActivityService {
  /**
   * Create a new activity entry
   * @param data Activity data to insert
   * @returns The created activity
   */
  createActivity(data: InsertActivity): Promise<any>;

  /**
   * Get activities for a specific user
   * @param userId The user ID to get activities for
   * @param options Query options for filtering and pagination
   * @returns Array of activities
   */
  getUserActivities(
    userId: number,
    options?: ActivityQueryOptions,
  ): Promise<any[]>;

  /**
   * Get the leaderboard based on user activity
   * @param options Query options for filtering and customization
   * @returns Array of leaderboard entries
   */
  getLeaderboard(
    options?: LeaderboardQueryOptions,
  ): Promise<LeaderboardEntry[]>;

  /**
   * Get global statistics about content submissions and approvals
   * @returns Global stats object
   */
  getGlobalStats(): Promise<GlobalStats>;

  /**
   * Get user statistics for a specific user
   * @param userId The user ID to get stats for
   * @returns User stats or null if not found
   */
  getUserStats(userId: number): Promise<SelectUserStats | null>;

  /**
   * Update user statistics
   * @param userId The user ID to update stats for
   * @param data The stats data to update
   * @returns The updated user stats
   */
  updateUserStats(
    userId: number,
    data: UpdateUserStats,
  ): Promise<SelectUserStats>;

  /**
   * Get feed-specific user statistics
   * @param userId The user ID
   * @param feedId The feed ID
   * @returns Feed user stats or null if not found
   */
  getFeedUserStats(
    userId: number,
    feedId: string,
  ): Promise<SelectFeedUserStats | null>;

  /**
   * Update feed-specific user statistics
   * @param userId The user ID
   * @param feedId The feed ID
   * @param data The stats data to update
   * @returns The updated feed user stats
   */
  updateFeedUserStats(
    userId: number,
    feedId: string,
    data: UpdateFeedUserStats,
  ): Promise<SelectFeedUserStats>;

  /**
   * Get feeds that a user has curated for
   * @param userId The user ID
   * @returns Array of feeds with curator stats
   */
  getFeedsCuratedByUser(userId: number): Promise<any[]>;

  /**
   * Get feeds that a user is an approver for
   * @param userId The user ID
   * @returns Array of feeds with approver stats
   */
  getFeedsApprovedByUser(userId: number): Promise<any[]>;

  /**
   * Get a user's rank for a specific feed
   * @param userId The user ID
   * @param feedId The feed ID
   * @returns Object containing curator and approver ranks
   */
  getUserFeedRanks(
    userId: number,
    feedId: string,
  ): Promise<{
    curatorRank: number | null;
    approverRank: number | null;
  }>;
}
