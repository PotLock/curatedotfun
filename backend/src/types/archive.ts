export interface FeedArchiveItem {
  id: string;
  feed_id: string;
  submitted_by: string;
  submitted_at: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  content: any;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ArchivePlugin {
  initialize(config: Record<string, string>): Promise<void>;
  
  // Create or update a feed item in the archive
  archiveFeedItem(feedItem: Partial<FeedArchiveItem> & { id: string }): Promise<FeedArchiveItem>;
  
  // Get feed items by different criteria
  getFeedItemsBySubmitter(submittedBy: string): Promise<FeedArchiveItem[]>;
  getFeedItemsByStatus(status: string): Promise<FeedArchiveItem[]>;
  getFeedItemsByApprover(approverId: string): Promise<FeedArchiveItem[]>;
  
  // Get aggregate statistics
  getFeedStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_submitter: Record<string, number>;
    by_approver: Record<string, number>;
  }>;

  shutdown?(): Promise<void>;
}
