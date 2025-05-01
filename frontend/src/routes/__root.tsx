import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import React from "react";
import { Toaster } from "../components/ui/toaster";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

export const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : React.lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      );

function RootComponent() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />
      </QueryClientProvider>
    </>
  );
}
