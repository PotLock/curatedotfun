import { getErrorMessage } from "@crosspost/sdk";
import { ConnectedAccount, Platform } from "@crosspost/types";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useAuthorizationStatus } from "../hooks/use-authorization-status";
import { createAuthenticatedMutation } from "../lib/authentication-service";
import { getClient } from "../lib/authorization-service";
import { useWeb3Auth } from "../hooks/use-web3-auth";

interface PlatformAccountsState {
  selectedAccountIds: string[];
  selectAccount: (userId: string) => void;
  unselectAccount: (userId: string) => void;
  toggleAccountSelection: (userId: string) => void;
  clearSelectedAccounts: () => void;
  isAccountSelected: (userId: string) => boolean;
}

export const usePlatformAccountsStore = create<PlatformAccountsState>()(
  persist(
    (set, get) => ({
      selectedAccountIds: [],

      selectAccount: (userId) => {
        set((state) => ({
          selectedAccountIds: [...state.selectedAccountIds, userId],
        }));
      },

      unselectAccount: (userId) => {
        set((state) => ({
          selectedAccountIds: state.selectedAccountIds.filter(
            (id) => id !== userId,
          ),
        }));
      },

      toggleAccountSelection: (userId) => {
        const state = get();
        if (state.selectedAccountIds.includes(userId)) {
          state.unselectAccount(userId);
        } else {
          state.selectAccount(userId);
        }
      },

      isAccountSelected: (userId) => {
        return get().selectedAccountIds.includes(userId);
      },

      clearSelectedAccounts: () => {
        set({ selectedAccountIds: [] });
      },
    }),
    {
      name: "crosspost-selected-accounts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useConnectedAccounts() {
  const { web3auth, provider } = useWeb3Auth();
  const isAuthorized = useAuthorizationStatus();

  return useQuery({
    queryKey: ["connectedAccounts"],
    queryFn: async () => {
      if (!web3auth || !provider) {
        throw new Error("Web3Auth not connected or provider unavailable.");
      }
      try {
        const client = getClient();
        const { accounts } = await client.auth.getConnectedAccounts();
        return accounts;
      } catch (error) {
        console.error(
          "Failed to fetch connected accounts:",
          getErrorMessage(error),
        );
        throw error;
      }
    },
    enabled: !!web3auth && !!provider && isAuthorized === true,
  });
}

export const useConnectAccount = createAuthenticatedMutation({
  mutationKey: ["connectAccount"],
  clientMethod: async (client, { platform }: { platform: Platform }) => {
    await client.auth.loginToPlatform(platform.toLowerCase() as Platform);
  },
  getAuthDetails: ({ platform }: { platform: Platform }) =>
    `loginToPlatform:${platform}`,
  onSuccess: (_, __, ___, queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["connectedAccounts"] });
  },
});

export const useDisconnectAccount = createAuthenticatedMutation({
  mutationKey: ["disconnectAccount"],
  clientMethod: async (
    client,
    { platform, userId }: { platform: Platform; userId: string },
  ) => {
    await client.auth.revokeAuth(platform.toLowerCase() as Platform, userId);
    return userId;
  },
  getAuthDetails: ({
    platform,
    userId,
  }: {
    platform: Platform;
    userId: string;
  }) => `revokeAuth:${platform}:${userId}`,
  onSuccess: (userId, _, __, queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["connectedAccounts"] });
    const store = usePlatformAccountsStore.getState();
    if (store.selectedAccountIds.includes(userId)) {
      store.unselectAccount(userId);
    }
  },
});

export const useRefreshAccount = createAuthenticatedMutation({
  mutationKey: ["refreshAccount"],
  clientMethod: async (
    client,
    { platform, userId }: { platform: Platform; userId: string },
  ) => {
    await client.auth.refreshProfile(platform.toLowerCase() as Platform, userId);
    return userId;
  },
  getAuthDetails: ({
    platform,
    userId,
  }: {
    platform: Platform;
    userId: string;
  }) => `refreshProfile:${platform}:${userId}`,
  onSuccess: (_, __, ___, queryClient) => {
    queryClient.invalidateQueries({ queryKey: ["connectedAccounts"] });
  },
});

export const useCheckAccountStatus = createAuthenticatedMutation({
  mutationKey: ["checkAccountStatus"],
  clientMethod: async (
    client,
    { platform, userId }: { platform: Platform; userId: string },
  ) => {
    const { authenticated, tokenStatus } = await client.auth.getAuthStatus(
      platform.toLowerCase() as Platform,
      userId,
    );
    const isConnected = authenticated && tokenStatus.valid;
    return { userId, isConnected };
  },
  getAuthDetails: ({
    platform,
    userId,
  }: {
    platform: Platform;
    userId: string;
  }) => `getAuthStatus:${platform}:${userId}`,
  onSuccess: (data, _, __, queryClient) => {
    queryClient.setQueryData(
      ["connectedAccounts"],
      (oldData: ConnectedAccount[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((account: ConnectedAccount) =>
          account.userId === data.userId
            ? {
                ...account,
                profile: account.profile
                  ? { ...account.profile, lastUpdated: Date.now() }
                  : null,
              }
            : account,
        );
      },
    );
  },
});

export function useNearAccount() {
  const { web3auth, provider, getNearAccount } = useWeb3Auth();

  return useQuery({
    queryKey: ["nearAccount"],
    queryFn: async () => {
      if (!web3auth || !provider) {
        throw new Error("Web3Auth not connected or provider unavailable.");
      }

      try {
        // Use the existing NEAR account from Web3Auth context
        const nearAccount = await getNearAccount();
        if (!nearAccount) {
          throw new Error("Failed to get NEAR account from Web3Auth");
        }

        // Get user info from Web3Auth
        const userInfo = await web3auth.getUserInfo();
        const network = import.meta.env.PUBLIC_NETWORK || "testnet";

        return {
          userId: nearAccount.accountId,
          platform: "near" as Platform,
          profile: {
            platform: "near" as Platform,
            userId: nearAccount.accountId,
            username: nearAccount.accountId,
            profileImageUrl: userInfo.profileImage || "",
            lastUpdated: Date.now(),
            url: `https://${network}.near.org/profile/${nearAccount.accountId}`,
            isPremium: false,
          },
          connectedAt: new Date().toISOString(),
        } as ConnectedAccount;
      } catch (error) {
        console.error("Error fetching NEAR account:", error);
        return null;
      }
    },
    enabled: !!web3auth && !!provider,
  });
}

export function useAllAccounts() {
  const { data: apiAccounts = [] } = useConnectedAccounts();
  const { data: nearAccount } = useNearAccount();
  return [...apiAccounts, ...(nearAccount ? [nearAccount] : [])];
}

export function useSelectedAccounts() {
  const allAccounts = useAllAccounts();
  const selectedAccountIds = usePlatformAccountsStore(
    (state) => state.selectedAccountIds,
  );
  return allAccounts.filter((account: ConnectedAccount) =>
    selectedAccountIds.includes(account.userId),
  );
}
