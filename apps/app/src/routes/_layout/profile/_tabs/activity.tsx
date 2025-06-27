import { createFileRoute } from "@tanstack/react-router";
import { ProfileActivity } from "../../../../components/profile/activity";

export const Route = createFileRoute("/_layout/profile/_tabs/activity")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProfileActivity />;
}
