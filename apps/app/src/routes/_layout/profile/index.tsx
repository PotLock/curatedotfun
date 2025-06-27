import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/profile/")({
  beforeLoad: () => {
    throw redirect({ to: "/profile/overview" });
  },
});
