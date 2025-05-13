import { ActivityServiceError } from "../types/errors";
import {
  ActivityQueryOptions,
  GlobalStats,
  InsertActivityData,
  LeaderboardEntry,
  LeaderboardQueryOptions,
  selectActivitySchema,
  SelectFeedUserStatsData,
  selectFeedUserStatsSchema,
  SelectUserStatsData,
  selectUserStatsSchema,
  UpdateFeedUserStatsData,
  UpdateUserStatsData,
} from "../validation/activity.validation";
import { ActivityRepository } from "./db/repositories/activity.repository";
import { ActivityType } from "./db/schema/activity";
import { IActivityService } from "./interfaces/activity.interface";

export class ActivityService implements IActivityService {
  constructor(private activityRepository: ActivityRepository) {}

  /**
   * Create a new activity entry
   */
  async createActivity(data: InsertActivityData) {
    try {
      const result = await this.activityRepository.createActivity({
        user_id: data.user_id,
        type: data.type as ActivityType,
        feed_id: data.feed_id || null,
        submission_id: data.submission_id || null,
        data:
          typeof data.data === "object" && data.data !== null
            ? (data.data as Record<string, any>)
            : null,
        metadata:
          typeof data.metadata === "object" && data.metadata !== null
            ? (data.metadata as Record<string, any>)
            : null,
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
  async getUserActivities(userId: number, options?: ActivityQueryOptions) {
    try {
      const activities = await this.activityRepository.getUserActivities(
        userId,
        options || {},
      );

      // Parse each activity through the schema
      return activities.map((activity: any) =>
        selectActivitySchema.parse(activity),
      );
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user activities: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get the leaderboard
   */
  async getLeaderboard(
    options?: LeaderboardQueryOptions,
  ): Promise<LeaderboardEntry[]> {
    try {
      return await this.activityRepository.getLeaderboard(options || {});
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get leaderboard: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      return await this.activityRepository.getGlobalStats();
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
  async getUserStats(userId: number): Promise<SelectUserStatsData | null> {
    try {
      const stats = await this.activityRepository.getUserStats(userId);

      if (!stats) {
        return null;
      }

      return selectUserStatsSchema.parse(stats);
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
    data: UpdateUserStatsData,
  ): Promise<SelectUserStatsData> {
    try {
      const result = await this.activityRepository.updateUserStats(userId, {
        total_submissions: data.total_submissions,
        total_approvals: data.total_approvals,
        total_points: data.total_points,
        data:
          typeof data.data === "object" && data.data !== null
            ? (data.data as Record<string, any>)
            : undefined,
        metadata:
          typeof data.metadata === "object" && data.metadata !== null
            ? (data.metadata as Record<string, any>)
            : undefined,
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
  ): Promise<SelectFeedUserStatsData | null> {
    try {
      const stats = await this.activityRepository.getFeedUserStats(
        userId,
        feedId,
      );

      if (!stats) {
        return null;
      }

      return selectFeedUserStatsSchema.parse(stats);
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
    data: UpdateFeedUserStatsData,
  ): Promise<SelectFeedUserStatsData> {
    try {
      const result = await this.activityRepository.updateFeedUserStats(
        userId,
        feedId,
        {
          submissions_count:
            data.submissions_count !== null
              ? data.submissions_count
              : undefined,
          approvals_count:
            data.approvals_count !== null ? data.approvals_count : undefined,
          points: data.points !== null ? data.points : undefined,
          curator_rank:
            data.curator_rank !== null ? data.curator_rank : undefined,
          approver_rank:
            data.approver_rank !== null ? data.approver_rank : undefined,
          data:
            typeof data.data === "object" && data.data !== null
              ? (data.data as Record<string, any>)
              : undefined,
          metadata:
            typeof data.metadata === "object" && data.metadata !== null
              ? (data.metadata as Record<string, any>)
              : undefined,
        },
      );

      return selectFeedUserStatsSchema.parse(result);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to update feed user stats: ${error instanceof Error ? error.message : String(error)}`,
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
