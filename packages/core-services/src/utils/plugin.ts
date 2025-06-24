import { createHash } from "crypto";
import { PluginType } from "@curatedotfun/types";
import { z } from "zod";
import { logger } from "@curatedotfun/utils";
import { PluginConfig } from "../services/plugin.service";

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
  config: PluginConfig<PluginType>,
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
export function validatePluginConfig(config: PluginConfig<PluginType>): void {
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

const packageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  author: z
    .union([
      z.string(),
      z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        url: z.string().optional(),
      }),
    ])
    .optional(),
  keywords: z.array(z.string()).optional(),
});

export type ParsedPackageJson = z.infer<typeof packageJsonSchema>;

/**
 * Fetches and parses package.json from a repository URL.
 * Currently supports GitHub, GitLab, and Bitbucket public repositories.
 * @param repoUrl - The URL to the repository (e.g., https://github.com/user/repo)
 * @returns Parsed package.json content or null if an error occurs.
 */
export async function fetchPackageJsonFromRepo(
  repoUrl: string,
): Promise<ParsedPackageJson | null> {
  if (!repoUrl) return null;

  let packageJsonUrlAttempted = "";

  try {
    const url = new URL(repoUrl);
    let userOrOrg, repoNameWithGit, repoName, potentialBranch, packageSubpath;

    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (pathSegments.length < 2) {
      logger.warn(`Invalid repo URL path: ${url.pathname} from ${repoUrl}`);
      return null;
    }

    userOrOrg = pathSegments[0];
    repoNameWithGit = pathSegments[1];
    repoName = repoNameWithGit.replace(".git", "");

    // Check for /tree/branch/subpath or /-/blob/branch/subpath (GitLab)
    let branchIndicatorIndex = pathSegments.indexOf("tree"); // GitHub, Bitbucket (sometimes)
    if (branchIndicatorIndex === -1) {
      branchIndicatorIndex = pathSegments.indexOf("blob"); // GitLab uses blob for files, tree for dirs
      if (
        branchIndicatorIndex !== -1 &&
        pathSegments[branchIndicatorIndex - 1] === "-"
      ) {
        // GitLab specific /-/blob/
        // Adjust for GitLab's /-/blob structure
      } else {
        branchIndicatorIndex = -1; // Not a valid branch indicator here
      }
    }

    if (
      branchIndicatorIndex !== -1 &&
      pathSegments.length > branchIndicatorIndex + 1
    ) {
      potentialBranch = pathSegments[branchIndicatorIndex + 1];
      packageSubpath = pathSegments.slice(branchIndicatorIndex + 2).join("/");
    } else {
      // No explicit branch/subpath in URL, assume root and try common branches
      potentialBranch = null; // Will iterate through commonBranches
      packageSubpath = "";
    }

    const branchesToTry = potentialBranch
      ? [potentialBranch]
      : ["main", "master", "develop"];
    let success = false;

    for (const branch of branchesToTry) {
      let currentSubpath = packageSubpath;
      // If trying common branches and a subpath was part of the original URL (but no branch),
      // it's tricky. The original code assumed package.json at root if no branch.
      // For now, if potentialBranch was null, we assume package.json is at the root of these common branches.
      // If a subpath was detected alongside a branch, we use that subpath.
      // If repoUrl was like github.com/user/repo/packages/my-plugin (no /tree/branch), this logic is imperfect.
      // The most robust way is to require /tree/branch/ in the URL if not root.
      // For simplicity, if no branch in URL, assume package.json at root of common branches.
      // If URL has /tree/branch/path/to/package, then currentSubpath is path/to/package.

      const packagePathInRepo = `${currentSubpath ? currentSubpath + "/" : ""}package.json`;

      let rawFileUrl = "";
      if (url.hostname === "github.com") {
        rawFileUrl = `https://raw.githubusercontent.com/${userOrOrg}/${repoName}/${branch}/${packagePathInRepo}`;
      } else if (url.hostname === "gitlab.com") {
        // GitLab raw URL structure: host/user/repo/-/raw/branch/filepath
        rawFileUrl = `${url.protocol}//${url.hostname}/${userOrOrg}/${repoName}/-/raw/${branch}/${packagePathInRepo}`;
      } else if (url.hostname === "bitbucket.org") {
        // Bitbucket raw URL structure: host/user/repo/raw/branch/filepath
        rawFileUrl = `https://bitbucket.org/${userOrOrg}/${repoName}/raw/${branch}/${packagePathInRepo}`;
      } else {
        logger.warn(
          `Unsupported repository host: ${url.hostname} for URL ${repoUrl}`,
        );
        return null;
      }

      packageJsonUrlAttempted = rawFileUrl;
      try {
        logger.debug(
          `Attempting to fetch package.json from: ${packageJsonUrlAttempted}`,
        );
        const response = await fetch(packageJsonUrlAttempted);
        if (response.ok) {
          const packageJson = await response.json();
          logger.info(
            `Successfully fetched package.json from: ${packageJsonUrlAttempted}`,
          );
          success = true;
          return packageJsonSchema.parse(packageJson);
        } else {
          logger.debug(
            `Failed to fetch ${packageJsonUrlAttempted}: ${response.status}`,
          );
        }
      } catch (e: any) {
        logger.debug(
          `Error fetching or parsing package.json from ${packageJsonUrlAttempted}`,
          { error: e.message },
        );
      }
    }

    if (!success) {
      logger.warn(
        `Could not find or parse package.json for repo: ${repoUrl}. Last tried: ${packageJsonUrlAttempted}`,
      );
    }
    return null;
  } catch (error: unknown) {
    logger.error(
      `Error processing repo URL ${repoUrl} (last attempted URL: ${packageJsonUrlAttempted}): ${(error as Error).message}`,
      { error },
    );
    return null;
  }
}
