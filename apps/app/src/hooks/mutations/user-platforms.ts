import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import {
  apiClient,
  ApiError,
  PlatformIdentityData,
} from "../../lib/api-client";
import { useAuth } from "../../contexts/auth-context";

type UpdateUserPlatformIdentitiesVariables = PlatformIdentityData[];

export const useUpdateUserPlatformIdentitiesMutation = (
  options?: UseMutationOptions<
    void,
    ApiError,
    UpdateUserPlatformIdentitiesVariables
  >,
) => {
  const { currentAccountId, isSignedIn } = useAuth();

  return useMutation<void, ApiError, UpdateUserPlatformIdentitiesVariables>({
    mutationFn: async (identities) => {
      if (!isSignedIn || !currentAccountId) {
        throw new ApiError("User is not authenticated.", 401);
      }
      return apiClient.updateUserPlatformIdentities(
        { currentAccountId, isSignedIn },
        identities,
      );
    },
    ...options,
  });
};
