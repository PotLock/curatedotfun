import { CrosspostClient, getErrorMessage, isAuthError } from "@crosspost/sdk";
import {
  PlatformName,
  type ApiResponse,
  type ConnectedAccount,
  type ConnectedAccountsResponse,
  type AuthCallbackResponse,
} from "@crosspost/types";
import { sign } from "near-sign-verify";
import { useAuth } from "../contexts/auth-context";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useUpdateUserPlatformIdentitiesMutation } from "../hooks/mutations/user-platforms";
import { PlatformIdentityData } from "./api-client";
import { near } from "./near";
import { useToast } from "../hooks/use-toast";

export const crosspostClient = new CrosspostClient();

export function useConnectedAccounts() {
  const { isSignedIn, currentAccountId } = useAuth();
  const queryKey: QueryKey = ["connectedCrosspostAccounts", currentAccountId];

  const queryFn = async (): Promise<ConnectedAccount[]> => {
    if (!isSignedIn || !currentAccountId) {
      return [];
    }
    crosspostClient.setAccountHeader(currentAccountId);

    const response: ApiResponse<ConnectedAccountsResponse> =
      await crosspostClient.auth.getConnectedAccounts();
    return response.data?.accounts || [];
  };

  const queryResult = useQuery<
    ConnectedAccount[],
    Error,
    ConnectedAccount[],
    QueryKey
  >({
    queryKey,
    queryFn,
    enabled: !!isSignedIn && !!currentAccountId,
  });

  return {
    connectedAccounts: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    error: queryResult.error
      ? isAuthError(queryResult.error)
        ? "Authentication with Crosspost failed. Please try reconnecting."
        : queryResult.error.message
      : null,
    refetchAccounts: async () => {
      await queryResult.refetch();
    },
  };
}

export interface ConnectAccountVariables {
  platform: PlatformName;
}

export const useConnectAccount = () => {
  const queryClient = useQueryClient();
  const { currentAccountId, isSignedIn } = useAuth();
  const updateUserDbMutation = useUpdateUserPlatformIdentitiesMutation();
  const { toast } = useToast();

  return useMutation<void, Error, ConnectAccountVariables>({
    mutationKey: ["connectAccount"],
    mutationFn: async ({
      platform,
    }: ConnectAccountVariables): Promise<void> => {
      try {
        const client = crosspostClient;
        const authDetails = `loginToPlatform:${platform}`;

        if (!isSignedIn || !currentAccountId) {
          throw new Error("Wallet not connected or account ID unavailable.");
        }

        // crosspostClient.auth.getNearAuthorizationStatus();

        // await crosspostClient.auth.authorizeNearAccount();

        toast({
          title: "Authenticating...",
          description: "Please sign the message in your wallet",
          variant: "default",
        });

        const message = `Authenticating request for NEAR account: ${currentAccountId}${authDetails ? ` (${authDetails})` : ""}`;
        const authToken = await sign({
          signer: near,
          recipient: "crosspost.near",
          message,
        });

        client.setAuthentication(authToken);

        const response: AuthCallbackResponse =
          await client.auth.loginToPlatform(
            platform.toLowerCase() as PlatformName,
          );

        if (
          response &&
          response.status &&
          typeof response.status === "object" &&
          response.status.code === "AUTH_SUCCESS"
        ) {
          const latestAccountsResponse: ApiResponse<ConnectedAccountsResponse> =
            await crosspostClient.auth.getConnectedAccounts();
          const latestAccounts = latestAccountsResponse.data?.accounts || [];

          if (latestAccounts.length > 0) {
            const platformIdentities: PlatformIdentityData[] = latestAccounts
              .map((acc) => ({
                platformName: acc.platform as string,
                platformUserId: acc.userId,
                username: acc.profile?.username || "",
                profileImageUrl: acc.profile?.profileImageUrl,
              }))
              .filter((identity) => identity.username);

            if (platformIdentities.length > 0) {
              await updateUserDbMutation.mutateAsync(platformIdentities);
            }
          }
          return; // Success: platform, userId, status.code format
        } else {
          console.error(
            "Unexpected response structure from loginToPlatform:",
            response,
          );
          throw new Error(
            "Unexpected response from server during platform login.",
          );
        }
      } catch (error) {
        console.error(
          `API Mutation Error [connectAccount/${platform}]:`,
          getErrorMessage(error),
        );
        if (error instanceof Error) {
          throw error; // Re-throw original error if it's already an Error instance
        }
        throw new Error(getErrorMessage(error)); // Ensure an Error instance is thrown
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connectedAccounts"] });
    },
  });
};
