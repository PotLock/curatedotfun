import { InboundPlugin } from "../../types/plugin";
import { AppConfig } from "../../types/config";
import { DistributionService } from "../distribution/distribution.service";
import { db } from "../db";
import { logger } from "../../utils/logger";

export class InboundService {
  private plugins: Map<string, InboundPlugin>;
  private distributionService: DistributionService;
  private config: AppConfig;
  private checkInterval: number = 60000; // 1 minute
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(distributionService: DistributionService, config: AppConfig) {
    this.plugins = new Map();
    this.distributionService = distributionService;
    this.config = config;
  }

  /**
   * Initialize all configured inbound plugins
   */
  async initialize() {
    const inbounds = this.config.inbounds || [];

    for (const inbound of inbounds) {
      try {
        // Get plugin definition from config
        const pluginDef = this.config.plugins[inbound.plugin];
        if (!pluginDef || pluginDef.type !== "inbound") {
          throw new Error(`Invalid inbound plugin: ${inbound.plugin}`);
        }

        // Import plugin module
        const module = await import(pluginDef.url);
        const Plugin = module.default;

        // Initialize plugin instance
        const instance = new Plugin(db);
        await instance.initialize(inbound.config);

        // Register plugin
        this.plugins.set(inbound.plugin, instance);
        logger.info(`Initialized inbound plugin: ${inbound.plugin}`);
      } catch (error) {
        logger.error(`Failed to initialize inbound plugin ${inbound.plugin}:`, error);
      }
    }
  }

  /**
   * Start monitoring for new submissions across all platforms
   */
  async startMonitoring() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(async () => {
      for (const [name, plugin] of this.plugins) {
        try {
          await this.checkForSubmissions(name, plugin);
        } catch (error) {
          logger.error(`Error checking ${name} submissions:`, error);
        }
      }
    }, this.checkInterval);

    // Initial check
    for (const [name, plugin] of this.plugins) {
      await this.checkForSubmissions(name, plugin);
    }
  }

  /**
   * Stop monitoring for submissions
   */
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Cleanup plugins
    for (const plugin of this.plugins.values()) {
      await plugin.shutdown?.();
    }
  }

  /**
   * Check for new submissions from a specific plugin
   */
  private async checkForSubmissions(pluginName: string, plugin: InboundPlugin) {
    try {
      // Get new submissions from plugin
      // Each plugin implements its own method of finding new submissions
      const submissions = await plugin.getSubmission({});

      if (!submissions) return;

      // Generate unique ID
      const id = plugin.generateSubmissionId(submissions.data);

      // Validate submission
      if (!plugin.validateSubmission(submissions.data, submissions.metadata)) {
        logger.warn(`Invalid submission from ${pluginName}:`, submissions);
        return;
      }

      // Save to database
      const now = new Date().toISOString();
      db.saveSubmission({
        id,
        data: submissions.data,
        metadata: submissions.metadata,
        createdAt: now,
        submittedAt: now,
      });

      await plugin.handleAcknowledgement(submissions.metadata);

      // Format for display/distribution
      const formatted = plugin.formatSubmission(
        submissions.data,
        submissions.metadata
      );

      // LETS HAVE FORMAT RETURN THE SUBMISSION TYPE WE EXPECT 
    } catch (error) {
      logger.error(`Error processing ${pluginName} submission:`, error);
    }
  }
checkNewMentions
  private getFeedIdFromSubmission(submission: { data: any; metadata: any }): string | undefined {
    // Get feed ID from config based on submission data/metadata
    // This could look at hashtags, mentioned accounts, or other platform-specific data
    const feeds = this.config.feeds || [];
    return feeds[0]?.id; // For now, just use the first feed
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): InboundPlugin | undefined {
    return this.plugins.get(name);
  }
}
