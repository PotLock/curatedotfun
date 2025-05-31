import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/")({
  component: FeedContentPage,
});

function FeedContentPage() {
  const { feedId } = Route.useParams();

  return <div>Content for {feedId}</div>;
}

export default FeedContentPage;
