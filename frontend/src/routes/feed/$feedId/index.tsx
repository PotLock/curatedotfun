import { createFileRoute } from "@tanstack/react-router";
import { useFeedItems } from "../../../lib/api";
import { useBotId } from "../../../lib/config";
import SubmissionList from "../../../components/SubmissionList";
import { useFilterStore } from "../../../store/useFilterStore";

export const Route = createFileRoute("/feed/$feedId/")({
  component: FeedContentPage,
});

function FeedContentPage() {
  const { feedId } = Route.useParams();
  const { data } = useFeedItems(feedId);
  const botId = useBotId();
  const { statusFilter } = useFilterStore();

  const items = data?.items || [];

  return (
    <div>
      <SubmissionList
        items={items}
        statusFilter={statusFilter}
        botId={botId}
        feedId={feedId}
        layout="grid"
      />
    </div>
  );
}

export default FeedContentPage;
