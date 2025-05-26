/**
 * Converts a package name to a normalized remote name by removing the @ symbol
 * and converting / to underscore. This is used for consistent remote package naming
 * in build configurations and package management.
 *
 * @example
 * ```ts
 * getNormalizedRemoteName('@curatedotfun/telegram') // 'curatedotfun_telegram'
 * getNormalizedRemoteName('@org/pkg-name') // 'org_pkg-name'
 * getNormalizedRemoteName('simple-package') // 'simple-package'
 * ```
 *
 * @param packageName - The original package name (e.g. '@scope/package')
 * @returns The normalized remote name (e.g. 'scope_package')
 */
export function getNormalizedRemoteName(packageName: string): string {
  return packageName.toLowerCase().replace("@", "").replace("/", "_");
}
