/**
 * Distributor URL utility functions
 *
 * This module provides functions to generate appropriate URLs for different
 * distributor types based on their configuration.
 */

export interface DistributorConfig {
  plugin: string;
  config?: Record<string, unknown>;
}

/**
 * Checks if a value is a template variable (contains {{ }})
 */
function isTemplateVariable(value: unknown): boolean {
  return typeof value === "string" && value.includes("{{");
}

/**
 * Safely gets a string value from config, returning null if it's a template
 */
function getConfigString(
  config: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = config?.[key];
  if (typeof value === "string" && !isTemplateVariable(value)) {
    return value;
  }
  return null;
}

/**
 * Generate URLs for RSS distributor
 */
function getRssUrl(config: Record<string, unknown> | undefined): string | null {
  // RSS distributors have a serviceUrl in their config that points to the RSS feed
  const serviceUrl = getConfigString(config, "serviceUrl");
  return serviceUrl;
}

/**
 * Generate URLs for Twitter distributor
 */
function getTwitterUrl(config: Record<string, unknown> | undefined): string {
  // Twitter links to the specific profile if available
  const username =
    getConfigString(config, "username") || getConfigString(config, "handle");
  if (username) {
    return `https://twitter.com/${username.replace("@", "")}`;
  }
  return "https://twitter.com";
}

/**
 * Generate URLs for Telegram distributor
 */
function getTelegramUrl(config: Record<string, unknown> | undefined): string {
  // Telegram links to the channel if chatId is available
  const chatId =
    getConfigString(config, "chatId") || getConfigString(config, "channelId");
  if (chatId) {
    const cleanChatId = chatId.replace("@", "");
    return `https://t.me/${cleanChatId}`;
  }
  return "https://telegram.org";
}

/**
 * Generate URLs for Notion distributor
 */
function getNotionUrl(config: Record<string, unknown> | undefined): string {
  // Notion links to the table/database if available
  const databaseId = getConfigString(config, "databaseId");
  if (databaseId) {
    return `https://notion.so/${databaseId}`;
  }
  return "https://notion.so";
}

/**
 * Generate URLs for Crosspost distributor
 */
function getCrosspostUrl(config: Record<string, unknown> | undefined): string {
  // Crosspost links to the Open Crosspost platform
  // Could potentially link to specific account if signerId is available
  const signerId = getConfigString(config, "signerId");
  if (signerId) {
    return `https://near.social/mob.near/widget/MainPage.N.Profile.Page?accountId=${signerId}`;
  }
  return "https://opencrosspost.com";
}

/**
 * Generate URLs for Discord distributor
 */
function getDiscordUrl(config: Record<string, unknown> | undefined): string {
  // Discord links to the specific channel if available
  const channelId = getConfigString(config, "channelId");
  if (channelId) {
    // Discord channel URLs format: https://discord.com/channels/serverId/channelId
    // Since we don't have serverId, we use @me which works for direct channel links
    return `https://discord.com/channels/@me/${channelId}`;
  }
  return "https://discord.com";
}

/**
 * Generate URLs for NEAR Social distributor
 */
function getNearSocialUrl(config: Record<string, unknown> | undefined): string {
  // NEAR Social links to the specific account if available
  const accountId = getConfigString(config, "accountId");
  if (accountId) {
    return `https://near.social/mob.near/widget/MainPage.N.Profile.Page?accountId=${accountId}`;
  }
  return "https://near.social";
}

/**
 * Generate URLs for Supabase distributor
 */
function getSupabaseUrl(config: Record<string, unknown> | undefined): string {
  // Supabase links to the project dashboard if URL is available
  const url = getConfigString(config, "url");
  if (url) {
    // Extract project reference from Supabase URL
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      const projectRef = match[1];
      return `https://supabase.com/dashboard/project/${projectRef}`;
    }
  }
  return "https://supabase.com";
}

/**
 * Get the clean plugin name without the @curatedotfun/ prefix
 */
function getPluginName(plugin: string): string {
  return plugin.replace("@curatedotfun/", "");
}

/**
 * Main function to get distributor URL based on plugin type and configuration
 */
export function getDistributorUrl(
  distributor: DistributorConfig,
): string | null {
  const pluginName = getPluginName(distributor.plugin);

  switch (pluginName) {
    case "rss":
      return getRssUrl(distributor.config);

    case "twitter":
    case "twitter-distributor":
      return getTwitterUrl(distributor.config);

    case "telegram":
    case "telegram-distributor":
      return getTelegramUrl(distributor.config);

    case "notion":
    case "notion-distributor":
      return getNotionUrl(distributor.config);

    case "crosspost":
    case "crosspost-distributor":
      return getCrosspostUrl(distributor.config);

    case "discord":
    case "discord-distributor":
      return getDiscordUrl(distributor.config);

    case "near-social":
    case "near-social-distributor":
    case "nearsocial":
      return getNearSocialUrl(distributor.config);

    case "supabase":
    case "supabase-distributor":
      return getSupabaseUrl(distributor.config);

    default:
      // For unknown distributors, return null to show badge without link
      return null;
  }
}

/**
 * Get a display-friendly name for the distributor
 */
export function getDistributorDisplayName(
  distributor: DistributorConfig,
): string {
  const pluginName = getPluginName(distributor.plugin);

  // Convert plugin names to display names
  switch (pluginName) {
    case "near-social":
    case "nearsocial":
      return "NEAR Social";
    case "rss":
      return "RSS";
    default:
      // Capitalize first letter for other distributors
      return pluginName.charAt(0).toUpperCase() + pluginName.slice(1);
  }
}

/**
 * Check if a distributor has a functional URL (not just a fallback)
 */
export function hasSpecificUrl(distributor: DistributorConfig): boolean {
  const pluginName = getPluginName(distributor.plugin);
  const config = distributor.config;

  switch (pluginName) {
    case "rss":
      return !!getConfigString(config, "serviceUrl");

    case "twitter":
    case "twitter-distributor":
      return !!(
        getConfigString(config, "username") || getConfigString(config, "handle")
      );

    case "telegram":
    case "telegram-distributor":
      return !!(
        getConfigString(config, "chatId") ||
        getConfigString(config, "channelId")
      );

    case "notion":
    case "notion-distributor":
      return !!getConfigString(config, "databaseId");

    case "crosspost":
    case "crosspost-distributor":
      return !!getConfigString(config, "signerId");

    case "discord":
    case "discord-distributor":
      return !!getConfigString(config, "channelId");

    case "near-social":
    case "near-social-distributor":
    case "nearsocial":
      return !!getConfigString(config, "accountId");

    case "supabase":
    case "supabase-distributor":
      return !!getConfigString(config, "url");

    default:
      return false;
  }
}
