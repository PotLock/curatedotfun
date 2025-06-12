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
      method: 'POST',
      path: '/users',
      message: 'createUserProfile',
    },
    {
      // onSuccess: (data, variables, context) => {
      //   const queryClient = useQueryClient();
      //   queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      // },
    }
  );
}

export function useCurrentUserProfile(enabled = true) {
  return useApiQuery<UserProfile | null>(
    ["currentUserProfile"],
    `/users/me`,
    { enabled },
  );
}
