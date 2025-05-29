import type { InsertUser } from "@curatedotfun/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWeb3Auth } from "../../hooks/use-web3-auth";
import { useTRPC, useTRPCClient } from "./index";

export function useCreateUserProfile() {
  const client = useTRPCClient();
  const { web3auth } = useWeb3Auth();

  return useMutation({
    mutationFn: async (variables: InsertUser) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      await web3auth.authenticateUser();
      return client.users.createUserProfile.mutate(variables);
    },
  });
}

export function useCurrentUserProfile(enabled = true) {
  const trpc = useTRPC();
  const { web3auth } = useWeb3Auth();

  return useQuery(
    trpc.users.getMyProfile.queryOptions(undefined, {
      enabled: !!web3auth && enabled,
    })
  );
}
