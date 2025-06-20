import {
  ActivityRepository,
  DB,
  InsertActivity,
  LeaderboardRepository,
  SelectActivity,
  selectActivitySchema,
  SelectFeedUserStats,
  selectFeedUserStatsSchema,
  SelectUserStats,
  selectUserStatsSchema,
  UpdateFeedUserStats,
  UpdateUserStats,
} from "@curatedotfun/shared-db";
import {
  ActivitySchema,
  FeedInfoSchema,
  GlobalStatsSchema,
  UserFeedRanksSchema,
  UserRankingLeaderboardEntrySchema,
  type Activity as ActivityApiType,
  type FeedInfo,
  type GetLeaderboardApiQuery,
  type GetUserActivitiesApiQuery,
  type GlobalStats,
  type UserFeedRanks,
  type UserRankingLeaderboardEntry,
} from "@curatedotfun/types";
import { ActivityServiceError } from "@curatedotfun/utils";
import { Logger } from "pino";
import { IBaseService } from "./interfaces/base-service.interface";
import { ModerationService } from "./moderation.service";
import { UserService } from "./users.service";

export class ActivityService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private activityRepository: ActivityRepository,
    private leaderboardRepository: LeaderboardRepository,
    private moderationService: ModerationService,
    private userService: UserService,
    private db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ActivityService.name });
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
  async getUserActivities(
    accountId: string,
    options?: GetUserActivitiesApiQuery,
  ): Promise<ActivityApiType[]> {
    try {
      const userProfile =
        await this.userService.findUserByNearAccountId(accountId);

      if (!userProfile) {
        this.logger.warn(
          { accountId },
          "User not found when trying to fetch activities by NEAR account ID.",
        );
        return []; // TODO: throw NotFoundError
      }

      const activities = await this.activityRepository.getUserActivities(
        userProfile.id,
        options,
      );

      let detailedModerationsMap = new Map();

      try {
        const detailedModerations =
          await this.moderationService.getModerationsByNearAccount(accountId);
        detailedModerations.forEach((modAction) => {
          if (modAction.submissionId) {
            if (!detailedModerationsMap.has(modAction.submissionId)) {
              detailedModerationsMap.set(modAction.submissionId, modAction);
            }
          }
        });
      } catch (modError) {
        this.logger.error(
          {
            accountId,
            error: modError,
          },
          "Failed to fetch detailed moderations for activity feed.",
        );
      }

      return activities.map((activity) => {
        const parsedActivity = selectActivitySchema.parse(activity);
        return ActivitySchema.parse(parsedActivity);
      });
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
    options?: GetLeaderboardApiQuery,
  ): Promise<UserRankingLeaderboardEntry[]> {
    try {
      const rawLeaderboardData =
        await this.activityRepository.getUserRankingLeaderboard(options);
      return rawLeaderboardData.map((entry) =>
        UserRankingLeaderboardEntrySchema.parse(entry),
      );
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
  ): Promise<UserRankingLeaderboardEntry[]> {
    try {
      const rawData =
        await this.leaderboardRepository.getCuratorStatsLeaderboard(timeRange);
      return rawData.map((entry) =>
        UserRankingLeaderboardEntrySchema.parse(entry),
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
  async getFeedsCuratedByUser(userId: number): Promise<FeedInfo[]> {
    try {
      const feeds = await this.activityRepository.getFeedsCuratedByUser(userId);
      return feeds.map((feed) => FeedInfoSchema.parse(feed));
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
  async getFeedsApprovedByUser(userId: number): Promise<FeedInfo[]> {
    try {
      const feeds =
        await this.activityRepository.getFeedsApprovedByUser(userId);
      return feeds.map((feed) => FeedInfoSchema.parse(feed));
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
  ): Promise<UserFeedRanks> {
    try {
      const ranks = await this.activityRepository.getUserFeedRanks(
        userId,
        feedId,
      );
      return UserFeedRanksSchema.parse(ranks);
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get user feed ranks: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}
