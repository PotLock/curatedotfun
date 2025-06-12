import { useQuery } from "@tanstack/react-query";
import { getProfile, Profile } from "src/lib/near-social";

/**
 * Fetches a user's NEAR Social profile.
 * @param accountId The NEAR account ID (e.g., "example.near")
 * @param options Optional Tanstack Query options.
 */
export function useNearSocialProfile(
  accountId: string,
) {
  return useQuery<Profile | null, Error>({
    queryKey: ["nearSocialProfile", accountId],
    queryFn: async () => {
      if (!accountId) {
        return null; // Or throw an error, depending on desired behavior
      }
      return getProfile(accountId);
    },
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
