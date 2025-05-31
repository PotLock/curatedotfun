import { Outlet, createRootRoute } from "@tanstack/react-router";
import React from "react";
import { Toaster } from "../components/ui/toaster";
import { AuthModals } from "../components/AuthModals";

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
      <Outlet />
      <Toaster />
      <AuthModals />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
