import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/profile/_tabs/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/profile/settings/connections", search: {} });
  },
});
