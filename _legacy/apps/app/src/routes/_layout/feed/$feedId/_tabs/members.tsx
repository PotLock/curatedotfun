import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs/members")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/feed/$feedId/members"!</div>;
}
