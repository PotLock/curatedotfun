import { generateNonce, NearAuthData } from "near-sign-verify";
import { toast } from "../hooks/use-toast";
import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { getClient } from "./authorization-service";
import { getErrorMessage } from "@crosspost/sdk";

type ClientMethodExecutor<TData, TVariables> = (
  client: any,
  variables: TVariables,
) => Promise<TData>;

type AuthDetailsGetter<TVariables> = (variables: TVariables) => string;

type OnSuccessCallback<TData, TVariables, TContext> = (
  data: TData,
  variables: TVariables,
  context: TContext | undefined,
  queryClient: QueryClient,
) => void | Promise<void>;

interface CreateAuthenticatedMutationProps<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> {
  /** Unique key for this mutation (used by React Query) */
  mutationKey: unknown[];
  /** Function that receives the authenticated client and variables, then calls the specific SDK method */
  clientMethod: ClientMethodExecutor<TData, TVariables>;
  /** Function that receives mutation variables and returns the string for authentication details */
  getAuthDetails: AuthDetailsGetter<TVariables>;
  /** Optional callback executed on mutation success */
  onSuccess?: OnSuccessCallback<TData, TVariables, TContext>;
  /** Optional callback executed on mutation error */
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Other standard useMutation options */
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn" | "mutationKey" | "onSuccess" | "onError"
  >;
}

/**
 * Factory function to create standardized useMutation hooks for authenticated API calls.
 * Handles wallet checks, authentication, client setup, basic error logging, and optional success/error callbacks.
 */
export function createAuthenticatedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>({
  mutationKey,
  clientMethod,
  getAuthDetails,
  onSuccess: onSuccessCallback,
  onError: onErrorCallback,
  options,
}: CreateAuthenticatedMutationProps<TData, TError, TVariables, TContext>) {
  return () => {
    const { web3auth, provider, getNearAccount } = useWeb3Auth();
    const queryClient = useQueryClient();

    return useMutation<TData, TError, TVariables, TContext>({
      mutationKey,
      mutationFn: async (variables: TVariables): Promise<TData> => {
        if (!web3auth || !provider || !getNearAccount) {
          throw new Error("Web3Auth not connected or provider unavailable.");
        }

        try {
          const client = getClient();
          const authDetailsString = getAuthDetails(variables);
          const authData = await authenticate(
            web3auth,
            getNearAccount,
            authDetailsString,
          );
          client.setAuthentication(authData);

          return await clientMethod(client, variables);
        } catch (error) {
          // Standardized error logging
          console.error(
            `API Mutation Error [${mutationKey.join("/")}]:`,
            getErrorMessage(error),
          );
          throw error;
        }
      },
      onSuccess: (data, variables, context) => {
        if (onSuccessCallback) {
          // Pass queryClient to the provided callback
          onSuccessCallback(data, variables, context, queryClient);
        }
      },
      onError: onErrorCallback,
      ...options,
    });
  };
}

/**
 * Creates the ephemeral authentication data needed for a specific API request.
 * This involves signing a message with the user's NEAR wallet.
 * This data should be generated immediately before making an authenticated API call.
 */
export async function authenticate(
  web3auth: any,
  getNearAccount: () => Promise<any>,
  requestDetails?: string,
): Promise<NearAuthData> {
  if (!web3auth || !getNearAccount) {
    throw new Error(
      "Web3Auth and getNearAccount are required for authentication",
    );
  }

  // Get NEAR account from Web3Auth context
  const nearAccount = await getNearAccount();
  if (!nearAccount || !nearAccount.keyPair) {
    throw new Error("Failed to get NEAR account from Web3Auth");
  }

  const accountId = nearAccount.accountId || "unknown";
  const message = `Authenticating request for NEAR account: ${accountId}${requestDetails ? ` (${requestDetails})` : ""}`;
  const nonce = generateNonce();
  const recipient = "crosspost.near";
  const callbackUrl = location.href;

  toast({
    title: "Authenticating...",
    description: "Please wait while we authenticate your request",
    variant: "default",
  });

  try {
    // Sign the message using the NEAR key pair
    const messageBuffer = Buffer.from(message);
    const signature = nearAccount.keyPair.sign(messageBuffer);

    console.log("authentication", {
      message,
      nonce: Buffer.from(nonce),
      recipient,
      callback_url: callbackUrl,
      signature: Buffer.from(signature.signature).toString("base64"),
      account_id: accountId,
      public_key: nearAccount.keyPair.getPublicKey().toString(),
    });

    return {
      message,
      nonce: Buffer.from(nonce),
      recipient,
      callback_url: callbackUrl,
      signature: Buffer.from(signature.signature).toString("base64"),
      account_id: accountId,
      public_key: nearAccount.keyPair.getPublicKey().toString(),
    };
  } catch (error) {
    console.error("Authentication error:", error);
    throw new Error(
      "Failed to authenticate with Web3Auth: " + getErrorMessage(error),
    );
  }
}
