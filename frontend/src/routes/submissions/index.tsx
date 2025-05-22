import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/submissions/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/submissions/"!</div>;
}
