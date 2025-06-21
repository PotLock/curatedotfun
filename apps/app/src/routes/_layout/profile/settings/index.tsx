import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/profile/settings/")({
  component: () => <Navigate to="/profile/settings/connections" />,
});
