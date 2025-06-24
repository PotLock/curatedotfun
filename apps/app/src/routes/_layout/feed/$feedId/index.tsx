import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/")({
  component: FeedContentPage,
});

function FeedContentPage() {
  return <p>TODO</p>;
}

export default FeedContentPage;
