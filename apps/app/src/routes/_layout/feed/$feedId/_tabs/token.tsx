import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs/token")({
  component: FeedTokenPage,
});

function FeedTokenPage() {
  const { feedId } = Route.useParams();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Token</h2>
      <p>Token information for Feed ID: {feedId}</p>
    </div>
  );
}

export default FeedTokenPage;
