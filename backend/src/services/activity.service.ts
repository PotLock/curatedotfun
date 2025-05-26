import { Logger } from "pino";
import {
  ActivityQueryOptionsSchema,
  GlobalStatsSchema,
  LeaderboardQueryOptionsSchema,
  UserRankingLeaderboardEntrySchema,
  type ActivityQueryOptions,
  type GlobalStats,
  type LeaderboardQueryOptions,
  type UserRankingLeaderboardEntry,
  DB,
  InsertActivity,
  SelectActivity,
  selectActivitySchema,
  SelectFeedUserStats,
  selectFeedUserStatsSchema,
  SelectUserStats,
  selectUserStatsSchema,
  UpdateFeedUserStats,
  UpdateUserStats,
} from "@curatedotfun/types";
import { ActivityServiceError } from "../types/errors";
import { queries, ActivityRepository, LeaderboardRepository } from "@curatedotfun/shared-db";
import { IActivityService } from "./interfaces/activity.interface";

export class ActivityService implements IActivityService {
  public readonly logger: Logger;

  constructor(
    private activityRepository: ActivityRepository,
    private leaderboardRepository: LeaderboardRepository,
    private db: DB,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  /**
   * Create a new activity entry
   */
  async createActivity(data: InsertActivity): Promise<SelectActivity> {
    try {
      const result = await this.db.transaction(async (tx) => {
        return this.activityRepository.createActivity(data, tx);
      });
      return selectActivitySchema.parse(result);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to create activity: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(userId: number, options?: ActivityQueryOptions): Promise<SelectActivity[]> {
    try {
      const validatedOptions = options ? ActivityQueryOptionsSchema.parse(options) : {};
      const activities = await this.activityRepository.getUserActivities(
        userId,
        validatedOptions,
      );

      return activities.map((activity: any) => selectActivitySchema.parse(activity));
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user activities: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get the user ranking leaderboard.
   */
  async getUserRankingLeaderboard(
    options?: LeaderboardQueryOptions,
  ): Promise<UserRankingLeaderboardEntry[]> {
    try {
      const validatedOptions = options ? LeaderboardQueryOptionsSchema.parse(options) : {};
      const rawLeaderboardData = await this.activityRepository.getUserRankingLeaderboard(
        validatedOptions,
      );
      // Assuming rawLeaderboardData is an array of objects that need to be parsed
      return rawLeaderboardData.map(entry => UserRankingLeaderboardEntrySchema.parse(entry));
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user ranking leaderboard: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const rawStats = await this.activityRepository.getGlobalStats();
      return GlobalStatsSchema.parse(rawStats);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get global stats: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: number): Promise<SelectUserStats | null> {
    // Use SelectUserStats
    try {
      const stats = await this.activityRepository.getUserStats(userId);

      if (!stats) {
        return null;
      }

      return selectUserStatsSchema.parse(stats); // Use selectUserStatsSchema from db/types
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user stats: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: number,
    data: UpdateUserStats,
  ): Promise<SelectUserStats> {
    try {
      const result = await this.db.transaction(async (tx) => {
        return this.activityRepository.updateUserStats(userId, data, tx);
      });
      return selectUserStatsSchema.parse(result);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to update user stats: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get feed-specific user statistics
   */
  async getFeedUserStats(
    userId: number,
    feedId: string,
  ): Promise<SelectFeedUserStats | null> {
    // Use SelectFeedUserStats
    try {
      const stats = await this.activityRepository.getFeedUserStats(
        userId,
        feedId,
      );

      if (!stats) {
        return null;
      }

      return selectFeedUserStatsSchema.parse(stats); // Use selectFeedUserStatsSchema from db/types
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get feed user stats: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Update feed-specific user statistics
   */
  async updateFeedUserStats(
    userId: number,
    feedId: string,
    data: UpdateFeedUserStats,
  ): Promise<SelectFeedUserStats> {
    try {
      const result = await this.db.transaction(async (tx) => {
        return this.activityRepository.updateFeedUserStats(
          userId,
          feedId,
          data,
          tx,
        );
      });
      return selectFeedUserStatsSchema.parse(result);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to update feed user stats: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get the curator statistics leaderboard.
   */
  async getCuratorStatsLeaderboard(
    timeRange: string = "all",
  ): Promise<queries.LeaderboardEntry[]> {
    try {
      return await this.leaderboardRepository.getCuratorStatsLeaderboard(
        timeRange,
      );
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get curator stats leaderboard: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get feeds that a user has curated for
   */
  async getFeedsCuratedByUser(userId: number): Promise<any[]> {
    try {
      return await this.activityRepository.getFeedsCuratedByUser(userId);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get feeds curated by user: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get feeds that a user is an approver for
   */
  async getFeedsApprovedByUser(userId: number): Promise<any[]> {
    try {
      return await this.activityRepository.getFeedsApprovedByUser(userId);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get feeds approved by user: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get a user's rank for a specific feed
   */
  async getUserFeedRanks(
    userId: number,
    feedId: string,
  ): Promise<{
    curatorRank: number | null;
    approverRank: number | null;
  }> {
    try {
      return await this.activityRepository.getUserFeedRanks(userId, feedId);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user feed ranks: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}
