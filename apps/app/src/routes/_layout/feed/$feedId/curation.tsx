import { createFileRoute } from "@tanstack/react-router";
import SubmissionFeed from "../../../../components/SubmissionFeed";
import { submissionSearchSchema } from "../../../../lib/api";

export const Route = createFileRoute("/_layout/feed/$feedId/curation")({
  validateSearch: (search) => submissionSearchSchema.parse(search),
  component: FeedCurationPage,
});

function FeedCurationPage() {
  const { feedId } = Route.useParams();

  return (
    <SubmissionFeed
      title="Recent Curation"
      feedId={feedId}
      parentRouteId={Route.id}
    />
  );
}

export default FeedCurationPage;
