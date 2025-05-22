import { createFileRoute } from "@tanstack/react-router";
import RecentSubmissions from "../../../../components/RecentSubmissions"; // Adjusted import path

export const Route = createFileRoute("/_layout/feed/$feedId/curation")({
  component: FeedCurationPage,
});

function FeedCurationPage() {
  const { feedId } = Route.useParams();

  return (
    <div>
      <RecentSubmissions title="Recent Curation" feedId={feedId} />
    </div>
  );
}

export default FeedCurationPage;
