import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/feed/$feedId/settings/connected")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/feed/$feedId/settings/connected"!</div>;
}
