import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/points")({
  component: FeedPointsPage,
});

function FeedPointsPage() {
  const { feedId } = Route.useParams();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Points</h2>
      <p>Points information for Feed ID: {feedId}</p>
    </div>
  );
}

export default FeedPointsPage;
