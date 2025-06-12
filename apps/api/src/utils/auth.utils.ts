/**
 * Parses the SUPER_ADMIN_ACCOUNTS environment variable string into an array of account IDs.
 * @param superAdminEnvVar The environment variable string (e.g., "admin1.near,admin2.near").
 * @returns An array of super admin account IDs.
 */
export function getSuperAdminAccounts(
  superAdminEnvVar: string | undefined,
): string[] {
  if (!superAdminEnvVar) {
    return [];
  }
  return superAdminEnvVar
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * Checks if a given account ID is in the list of super admins.
 * @param accountId The account ID to check. Can be null.
 * @param superAdminList An array of super admin account IDs.
 * @returns True if the accountId is a super admin, false otherwise.
 */
export function isSuperAdmin(
  accountId: string | null,
  superAdminList: string[],
): boolean {
  if (!accountId) {
    return false;
  }
  return superAdminList.includes(accountId);
}
