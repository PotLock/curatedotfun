import { createFileRoute } from "@tanstack/react-router";
import { MyFeeds } from "../../../../components/profile/my-feeds";

export const Route = createFileRoute("/_layout/profile/_tabs/my-feeds")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MyFeeds />;
}