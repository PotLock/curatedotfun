import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/feed/$feedId/proposals")({
  component: FeedProposalsPage,
});

function FeedProposalsPage() {
  const { feedId } = Route.useParams();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Proposals</h2>
      <p>Proposals content for Feed ID: {feedId}</p>
    </div>
  );
}

export default FeedProposalsPage;
