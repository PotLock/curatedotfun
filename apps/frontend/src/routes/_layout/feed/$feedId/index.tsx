import { createFileRoute } from "@tanstack/react-router";
import SubmissionFeed from "../../../../components/SubmissionFeed";

export const Route = createFileRoute("/_layout/feed/$feedId/")({
  component: FeedContentPage,
});

function FeedContentPage() {
  const { feedId } = Route.useParams();

  // TODO: replace with content from rss
  return (
    <SubmissionFeed
      title="Recent Curation"
      feedId={feedId}
      parentRouteId={Route.id}
    />
  );
}

export default FeedContentPage;
