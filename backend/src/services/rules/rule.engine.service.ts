import { ConfigService } from "../config/config.service";
import { PluginService } from "../plugins/plugin.service";
import { TransformationService } from "../transformation/transformation.service";
import { logger } from "../../utils/logger";
import {
  ISourcePlugin,
  RuleConfig,
  RuleProcessingResult,
  SourceData,
} from "../../core/rules/rules.types";
import { PluginError } from "../../types/errors";

/**
 * Service responsible for processing rules and orchestrating the interactions
 * between source plugins, conditions, and actions.
 */
export class RuleEngineService {
  // In-memory map to track the last processed ID for each rule source
  private lastProcessedInfo: Map<string, string> = new Map();

  constructor(
    private configService: ConfigService,
    private pluginService: PluginService,
    private transformationService: TransformationService
  ) {}

  /**
   * Process a specific rule by ID
   * @param ruleId The ID of the rule to process
   * @returns Result of the rule processing
   */
  public async processRule(ruleId: string): Promise<RuleProcessingResult> {
    const rules = this.configService.getConfig().rules || [];
    const rule = rules.find((r) => r.id === ruleId);

    if (!rule) {
      throw new Error(`Rule with ID ${ruleId} not found`);
    }

    if (!rule.enabled) {
      logger.info(`Rule ${ruleId} is disabled, skipping`);
      return {
        ruleId,
        success: true,
        message: "Rule is disabled",
        processedItems: 0,
      };
    }

    try {
      logger.info(`Processing rule: ${rule.id} - ${rule.description}`);
      
      // Fetch data from all sources
      const allSourceData = await this.fetchDataFromSources(rule);
      
      if (allSourceData.length === 0) {
        logger.info(`No new data found for rule ${ruleId}`);
        return {
          ruleId,
          success: true,
          message: "No new data found",
          processedItems: 0,
        };
      }

      // Process conditions (simplified for now - assume all conditions pass)
      // TODO: Implement full condition evaluation in Phase 2
      if (rule.conditions && rule.conditions.length > 0) {
        logger.info(`Rule ${ruleId} has ${rule.conditions.length} conditions, but condition evaluation is not fully implemented yet`);
      }

      // Execute actions
      await this.executeActions(rule, allSourceData);

      return {
        ruleId,
        success: true,
        message: `Successfully processed rule ${ruleId}`,
        processedItems: allSourceData.length,
      };
    } catch (error) {
      logger.error(`Error processing rule ${ruleId}:`, error);
      return {
        ruleId,
        success: false,
        message: `Error processing rule: ${error instanceof Error ? error.message : String(error)}`,
        processedItems: 0,
        errors: [error instanceof Error ? error : new Error(String(error))],
      };
    }
  }

  /**
   * Process all enabled rules
   * @returns Results of processing each rule
   */
  public async processAllRules(): Promise<RuleProcessingResult[]> {
    const rules = this.configService.getConfig().rules || [];
    const enabledRules = rules.filter((rule) => rule.enabled);
    
    logger.info(`Processing ${enabledRules.length} enabled rules`);
    
    const results: RuleProcessingResult[] = [];
    
    for (const rule of enabledRules) {
      try {
        const result = await this.processRule(rule.id);
        results.push(result);
      } catch (error) {
        logger.error(`Error processing rule ${rule.id}:`, error);
        results.push({
          ruleId: rule.id,
          success: false,
          message: `Error processing rule: ${error instanceof Error ? error.message : String(error)}`,
          processedItems: 0,
          errors: [error instanceof Error ? error : new Error(String(error))],
        });
      }
    }
    
    return results;
  }

  /**
   * Fetch data from all sources defined in a rule
   * @param rule The rule configuration
   * @returns Combined array of source data
   */
  private async fetchDataFromSources(rule: RuleConfig): Promise<SourceData[]> {
    const allSourceData: SourceData[] = [];
    
    for (const sourceConfig of rule.sources) {
      try {
        // Create a unique key for this rule source
        const ruleSourceKey = `${rule.id}:${sourceConfig.id}`;
        const lastProcessedId = this.lastProcessedInfo.get(ruleSourceKey);
        
        logger.info(`Fetching data from source ${sourceConfig.plugin} (${sourceConfig.id}) for rule ${rule.id}`);
        
        // Get the source plugin
        // Use any to bypass type constraints since 'source' is not in the original PluginType
        const sourcePlugin = await this.pluginService.getPlugin(
          sourceConfig.plugin,
          { type: 'source' as any, config: sourceConfig.config }
        ) as ISourcePlugin;
        
        // Fetch data from the source
        const sourceData = await sourcePlugin.fetchData(
          sourceConfig.config,
          lastProcessedId
        );
        
        if (sourceData.length > 0) {
          logger.info(`Found ${sourceData.length} new items from source ${sourceConfig.id}`);
          
          // Add source plugin name to each data item
          const enhancedData = sourceData.map(item => ({
            ...item,
            sourcePlugin: sourceConfig.plugin,
          }));
          
          allSourceData.push(...enhancedData);
          
          // Update the last processed ID
          this.updateLastProcessedId(ruleSourceKey, sourceData);
        } else {
          logger.info(`No new data from source ${sourceConfig.id}`);
        }
      } catch (error) {
        logger.error(`Error fetching data from source ${sourceConfig.plugin}:`, error);
        if (error instanceof PluginError) {
          throw error;
        }
        throw new Error(`Failed to fetch data from source ${sourceConfig.plugin}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return allSourceData;
  }

  /**
   * Execute the actions defined in a rule
   * @param rule The rule configuration
   * @param sourceData The data to process
   */
  private async executeActions(rule: RuleConfig, sourceData: SourceData[]): Promise<void> {
    if (!rule.actions) {
      logger.info(`Rule ${rule.id} has no actions defined`);
      return;
    }

    // Apply transformations if defined
    let transformedData = sourceData;
    if (rule.actions.transform && rule.actions.transform.length > 0) {
      logger.info(`Applying ${rule.actions.transform.length} transformations for rule ${rule.id}`);
      transformedData = await this.transformationService.applyTransforms(
        sourceData,
        rule.actions.transform
      );
    }

    // Execute distribution actions if defined
    if (rule.actions.distribute && rule.actions.distribute.length > 0) {
      logger.info(`Executing ${rule.actions.distribute.length} distribution actions for rule ${rule.id}`);
      
      for (const distributorConfig of rule.actions.distribute) {
        try {
          // Apply per-distributor transformations if defined
          let distributorData = transformedData;
          if (distributorConfig.transform && distributorConfig.transform.length > 0) {
            logger.info(`Applying ${distributorConfig.transform.length} distributor-specific transformations`);
            distributorData = await this.transformationService.applyTransforms(
              transformedData,
              distributorConfig.transform,
              'distributor'
            );
          }
          
          // Get the distributor plugin
          const distributorPlugin = await this.pluginService.getPlugin(
            distributorConfig.plugin,
            { type: 'distributor', config: distributorConfig.config }
          );
          
          // Distribute the data
          await distributorPlugin.distribute({
            input: distributorData,
            config: distributorConfig.config,
          });
          
          logger.info(`Successfully distributed data using ${distributorConfig.plugin}`);
        } catch (error) {
          logger.error(`Error distributing data with ${distributorConfig.plugin}:`, error);
          throw new Error(`Failed to distribute data with ${distributorConfig.plugin}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  /**
   * Update the last processed ID for a rule source
   * @param ruleSourceKey The unique key for the rule source
   * @param data The source data
   */
  private updateLastProcessedId(ruleSourceKey: string, data: SourceData[]): void {
    if (data.length > 0) {
      // Find the item with the latest timestamp
      const latestItem = data.reduce((latest, current) => {
        const latestDate = latest.timestamp instanceof Date 
          ? latest.timestamp 
          : new Date(latest.timestamp);
        
        const currentDate = current.timestamp instanceof Date 
          ? current.timestamp 
          : new Date(current.timestamp);
        
        return currentDate > latestDate ? current : latest;
      });
      
      this.lastProcessedInfo.set(ruleSourceKey, latestItem.id);
      logger.info(`Updated lastProcessedId for ${ruleSourceKey} to ${latestItem.id}`);
    }
  }

  /**
   * Get the current state of last processed IDs
   * @returns Map of rule source keys to last processed IDs
   */
  public getLastProcessedInfo(): Map<string, string> {
    return new Map(this.lastProcessedInfo);
  }

  /**
   * Set a specific last processed ID
   * @param ruleId The rule ID
   * @param sourceId The source ID within the rule
   * @param lastId The last processed ID
   */
  public setLastProcessedId(ruleId: string, sourceId: string, lastId: string): void {
    const key = `${ruleId}:${sourceId}`;
    this.lastProcessedInfo.set(key, lastId);
    logger.info(`Manually set lastProcessedId for ${key} to ${lastId}`);
  }

  /**
   * Clear all last processed IDs
   */
  public clearLastProcessedInfo(): void {
    this.lastProcessedInfo.clear();
    logger.info('Cleared all lastProcessedInfo');
  }
}
