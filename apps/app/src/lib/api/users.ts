import {
  CreateUserRequest,
  UserProfile,
  UserProfileWrappedResponse,
} from "@curatedotfun/types";
import { useApiQuery } from "../../hooks/api-client";
import { toast } from "../../hooks/use-toast";
import { apiClient, ApiError } from "../api-client";

export function useCurrentUserProfile(enabled = true) {
  return useApiQuery<UserProfile | null>(["currentUserProfile"], `/users/me`, {
    enabled,
  });
}

export function useGetUserByNearAccountId(
  nearAccountId: string | null,
  options?: { enabled?: boolean; retry?: boolean | number },
) {
  return useApiQuery<UserProfile | null>(
    ["userByNearAccountId", nearAccountId],
    `/users/by-near/${nearAccountId}`,
    {
      enabled:
        options?.enabled !== undefined
          ? options.enabled && !!nearAccountId
          : !!nearAccountId,
      retry: options?.retry === undefined ? 1 : options.retry, // Default to 1 retry, or allow disabling/customizing
    },
  );
}

/**
 * Checks if a user profile exists for the given NEAR account ID.
 * If not, it attempts to create one.
 * Called imperatively after user signs in.
 * @param accountId The NEAR account ID of the signed-in user.
 * @returns The user profile (existing or newly created), or null if an error occurred.
 */
export async function ensureUserProfile(
  accountId: string,
): Promise<UserProfile | null> {
  try {
    const response = await apiClient.makeRequest<{ profile: UserProfile }>(
      "GET",
      `/users/by-near/${accountId}`,
      { currentAccountId: accountId, isSignedIn: true },
    );
    return response.profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // User profile not found (404), proceed to create it.
      try {
        const response = await apiClient.makeRequest<
          // TODO: honestly, creating an account can be entirely server-side, and just be a log of whoever signed in
          UserProfileWrappedResponse, // TODO: ApiSuccessResponse can be moved to makeRequest typings after all types are aligned
          CreateUserRequest
        >(
          "POST",
          "/users",
          { currentAccountId: accountId, isSignedIn: true },
          {
            username: accountId.split(".")[0],
            nearAccountId: accountId,
          },
          "createUserProfile",
        );

        if (response.success && response.data) {
          // this data extraction will be moved to makeRequest response
          const newUserProfile = response.data;
          toast({
            title: "Account Created",
            description: "Your profile has been successfully set up.",
            variant: "success",
          });
          return newUserProfile;
        }

        return null;
      } catch (creationError) {
        console.error("Error creating user profile:", creationError);
        const creationErrorMessage =
          creationError instanceof Error
            ? creationError.message
            : "Could not create your user profile.";
        toast({
          title: "Account Creation Failed",
          description: creationErrorMessage,
          variant: "destructive",
        });
        return null; // Failed to create profile
      }
    } else {
      // An error other than 404 occurred while fetching the profile.
      console.error("Error fetching user profile:", error);
      const fetchErrorMessage =
        error instanceof Error
          ? error.message
          : "Could not verify your user profile.";
      toast({
        title: "Profile Check Failed",
        description: fetchErrorMessage,
        variant: "destructive",
      });
      return null; // Failed to fetch profile
    }
  }
}
