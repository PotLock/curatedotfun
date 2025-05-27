import React, { useMemo } from "react";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@curatedotfun/api-contract";
import { useAuth } from "../../contexts/AuthContext";
import { TRPCProvider } from "../../lib/trpc";
import { type QueryClient as TanStackQueryClient } from "@tanstack/react-query";

interface TRPCManagerProps {
  children: React.ReactNode;
  queryClient: TanStackQueryClient;
}

export function TRPCManager({ children, queryClient }: TRPCManagerProps) {
  const { idToken } = useAuth();

  const trpcClient = useMemo(() => {
    console.log(
      "TRPCManager: (Re)creating tRPC client. Token present:",
      !!idToken,
    );
    return createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (opts) =>
            import.meta.env.DEV ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: "/trpc",
          async headers() {
            const headers: Record<string, string> = {};
            if (idToken) {
              headers["Authorization"] = `Bearer ${idToken}`;
            }
            return headers;
          },
        }),
      ],
    });
  }, [idToken]);

  return (
    <TRPCProvider client={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  );
}
