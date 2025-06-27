import { createFileRoute } from "@tanstack/react-router";
import { ProfileOverview } from "../../../../components/profile/overview";

export const Route = createFileRoute("/_layout/profile/_tabs/overview")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProfileOverview />;
}
