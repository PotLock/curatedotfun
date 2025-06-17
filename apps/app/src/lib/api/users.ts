import { z } from "zod";
import { useApiQuery, useApiMutation } from "../../hooks/api-client"; // Adjusted path
import { usernameSchema, UserProfile } from "../../lib/validation/user"; // Import from existing validation file

export type CreateUserProfilePayload = {
  username: z.infer<typeof usernameSchema>;
  near_public_key: string;
  name?: string | null;
  email?: string | null;
};

export function useCreateUserProfile() {
  type CreateUserProfileVariables = CreateUserProfilePayload;

  return useApiMutation<UserProfile, Error, CreateUserProfileVariables>(
    {
      method: "POST",
      path: "/users",
      message: "createUserProfile",
    },
    {
      // onSuccess: (data, variables, context) => {
      //   const queryClient = useQueryClient();
      //   queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      // },
    },
  );
}

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
      // React Query will throw an error for 4xx/5xx responses by default.
      // The component using this hook can catch QueryError and check error.status.
    },
  );
}
