import { createClient } from "@supabase/supabase-js";
import { ArchivePlugin, FeedArchiveItem } from "../../types/archive";
import { logger } from "../../utils/logger";

export default class SupabaseArchivePlugin implements ArchivePlugin {
  name = "supabase-archive";
  private supabase: any;
  private tableName = "feed_archives";

  async initialize(config: Record<string, string>): Promise<void> {
    if (!config.url || !config.serviceKey) {
      throw new Error("Supabase archive plugin requires url and serviceKey");
    }

    try {
      this.supabase = createClient(config.url, config.serviceKey);
      
      // Create table if it doesn't exist with appropriate indexes
      const { error } = await this.supabase.rpc("create_feed_archives_if_not_exists", {
        table_name: this.tableName,
        indexes: [
          "submitted_by",
          "status",
          "approved_by"
        ]
      });
      
      if (error) {
        logger.error("Failed to initialize Supabase archive table:", error);
        throw error;
      }

      logger.info("Successfully initialized Supabase archive plugin");
    } catch (error) {
      logger.error("Error initializing Supabase archive plugin:", error);
      throw error;
    }
  }

  async archiveFeedItem(feedItem: Partial<FeedArchiveItem> & { id: string }): Promise<FeedArchiveItem> {
    try {
      const now = new Date().toISOString();
      
      // Upsert - create or update existing record
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert({
          ...feedItem,
          updated_at: now,
          created_at: feedItem.created_at || now // Only set created_at if it's a new record
        })
        .select()
        .single();

      if (error) {
        logger.error("Failed to archive feed item:", error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error archiving feed item:", error);
      throw error;
    }
  }

  async getFeedItemsBySubmitter(submittedBy: string): Promise<FeedArchiveItem[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("submitted_by", submittedBy)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Failed to get feed items by submitter:", error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error getting feed items by submitter:", error);
      throw error;
    }
  }

  async getFeedItemsByStatus(status: string): Promise<FeedArchiveItem[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("status", status)
        .order("updated_at", { ascending: false });

      if (error) {
        logger.error("Failed to get feed items by status:", error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error getting feed items by status:", error);
      throw error;
    }
  }

  async getFeedItemsByApprover(approverId: string): Promise<FeedArchiveItem[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select("*")
        .eq("approved_by", approverId)
        .order("approved_at", { ascending: false });

      if (error) {
        logger.error("Failed to get feed items by approver:", error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error getting feed items by approver:", error);
      throw error;
    }
  }

  async getFeedStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_submitter: Record<string, number>;
    by_approver: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase.rpc("get_feed_archive_stats");
      
      if (error) {
        logger.error("Failed to get feed stats:", error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Error getting feed stats:", error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for Supabase client
    logger.info("Shutting down Supabase archive plugin");
  }
}
