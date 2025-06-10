import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/profile/_root")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/profile/_root"!</div>;
}
