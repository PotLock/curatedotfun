import { createHash } from "crypto";
import { PluginConfig, PluginType } from "../types/plugins";

/**
 * Creates a deterministic cache key for a plugin instance by combining and hashing
 * the plugin name and config. The key will be the same for identical combinations
 * of these values, allowing for proper instance caching.
 *
 * @param name - Plugin name/identifier
 * @param config - Plugin configuration object
 * @returns A deterministic cache key as a hex string
 */
export function createPluginInstanceKey(
  name: string,
  config: PluginConfig<PluginType, any>,
): string {
  // Sort object keys recursively to ensure deterministic ordering
  const sortedData = sortObjectKeys({
    name,
    config: config.config || {},
  });

  // Create hash of the sorted data
  const hash = createHash("sha256");
  hash.update(JSON.stringify(sortedData));

  // Return first 8 chars of hex digest for a reasonably short but unique key
  return hash.digest("hex").slice(0, 16);
}

/**
 * Recursively sorts all keys in an object to create a deterministic structure.
 * This ensures that the same data will always produce the same hash regardless
 * of the original key ordering.
 *
 * @param obj - Object to sort keys for
 * @returns A new object with sorted keys
 */
export function sortObjectKeys<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as unknown as T;
  }

  // Check for non-serializable properties
  for (const value of Object.values(obj)) {
    if (typeof value === "function" || value instanceof RegExp) {
      throw new Error("Object contains non-serializable properties");
    }
  }

  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((sorted, key) => {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return sorted;
    }, {}) as T;
}

/**
 * Validates that a plugin configuration object has all required fields
 * and that they are of the correct type.
 *
 * @param config - Plugin configuration to validate
 * @throws Error if configuration is invalid
 */
export function validatePluginConfig(
  config: PluginConfig<PluginType, any>,
): void {
  if (!config) {
    throw new Error("Plugin configuration is required");
  }

  if (!config.type) {
    throw new Error("Plugin type is required");
  }

  if (!config.url) {
    throw new Error("Plugin URL is required");
  }

  try {
    new URL(config.url);
  } catch (error) {
    throw new Error("Plugin URL must be a valid URL");
  }

  // Config is optional but must be an object if present
  if (config.config && typeof config.config !== "object") {
    throw new Error("Plugin config must be an object");
  }
}
