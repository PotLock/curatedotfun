import { ArchivePlugin, FeedArchiveItem } from "../../types/archive";

export class MockArchiveService {
  public archivedItems: Array<FeedArchiveItem> = [];
  private plugin: ArchivePlugin;

  constructor() {
    // Create a plugin that implements ArchivePlugin
    this.plugin = {
      initialize: async () => {},
      archiveFeedItem: this.archiveFeedItem.bind(this),
      getFeedItemsBySubmitter: this.getFeedItemsBySubmitter.bind(this),
      getFeedItemsByStatus: this.getFeedItemsByStatus.bind(this),
      getFeedItemsByApprover: this.getFeedItemsByApprover.bind(this),
      getFeedStats: this.getFeedStats.bind(this),
      shutdown: this.shutdown.bind(this)
    };
  }

  async initialize(config: { plugin: string; config: Record<string, string> }): Promise<void> {}

  async archiveFeedItem(feedItem: Partial<FeedArchiveItem> & { id: string }): Promise<FeedArchiveItem> {
    const item: FeedArchiveItem = {
      id: feedItem.id,
      feed_id: feedItem.feed_id || "",
      submitted_by: feedItem.submitted_by || "",
      submitted_at: feedItem.submitted_at || new Date().toISOString(),
      status: feedItem.status || "pending",
      approved_by: feedItem.approved_by || null,
      approved_at: feedItem.approved_at || null,
      content: feedItem.content || {},
      metadata: feedItem.metadata || {},
      created_at: feedItem.created_at || new Date().toISOString(),
      updated_at: feedItem.updated_at || new Date().toISOString()
    };
    
    this.archivedItems.push(item);
    return item;
  }

  async getFeedItemsBySubmitter(submittedBy: string): Promise<FeedArchiveItem[]> {
    return this.archivedItems.filter(item => item.submitted_by === submittedBy);
  }

  async getFeedItemsByStatus(status: string): Promise<FeedArchiveItem[]> {
    return this.archivedItems.filter(item => item.status === status);
  }

  async getFeedItemsByApprover(approverId: string): Promise<FeedArchiveItem[]> {
    return this.archivedItems.filter(item => item.approved_by === approverId);
  }

  async getFeedStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_submitter: Record<string, number>;
    by_approver: Record<string, number>;
  }> {
    const by_status: Record<string, number> = {};
    const by_submitter: Record<string, number> = {};
    const by_approver: Record<string, number> = {};

    this.archivedItems.forEach(item => {
      by_status[item.status] = (by_status[item.status] || 0) + 1;
      by_submitter[item.submitted_by] = (by_submitter[item.submitted_by] || 0) + 1;
      if (item.approved_by) {
        by_approver[item.approved_by] = (by_approver[item.approved_by] || 0) + 1;
      }
    });

    return {
      total: this.archivedItems.length,
      by_status,
      by_submitter,
      by_approver
    };
  }

  async shutdown(): Promise<void> {
    this.archivedItems = [];
  }
}
