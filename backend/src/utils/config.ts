import { logger } from "./logger";

/**
 * Recursively processes a config object, replacing environment variable placeholders
 * with their actual values.
 *
 * Format: "{ENV_VAR_NAME}" will be replaced with process.env.ENV_VAR_NAME
 */
export function hydrateConfigValues<T extends Record<string, any>>(
  config: T,
): T {
  const processValue = (value: any): any => {
    if (typeof value === "string") {
      // Match strings like "{SOME_ENV_VAR}"
      const match = value.match(/^\{([A-Z_][A-Z0-9_]*)\}$/);
      if (match) {
        const envVar = match[1];
        const envValue = process.env[envVar];
        if (!envValue) {
          logger.error(`Required environment variable ${envVar} is not set`);
        }
        return envValue;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => processValue(item));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, processValue(v)]),
      );
    }

    return value;
  };

  return processValue(config);
}
