import { createFileRoute } from "@tanstack/react-router";
import FeedList from "../../components/FeedList";
import Layout from "../../components/Layout";
import { useState } from "react";
import { Submission } from "../../types/twitter";
import { useBotId } from "../../lib/config";
import { useAllSubmissions } from "../../lib/api";
import FeedHeader from "../../components/FeedHeader";
import SubmissionList from "../../components/SubmissionList";
import InfiniteFeed from "../../components/InfiniteFeed";

export const Route = createFileRoute("/feed/")({
  component: FeedIndexPage,
});

function FeedIndexPage() {
  const botId = useBotId();
  const [statusFilter, setStatusFilter] = useState<
    "all" | Submission["status"]
  >("all");

  // Fetch submissions with infinite scroll
  const ITEMS_PER_PAGE = 20;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useAllSubmissions(
      ITEMS_PER_PAGE,
      statusFilter === "all" ? undefined : statusFilter,
    );

  // Get the items from the transformed data
  const items = data?.items || [];

  const sidebarContent = (
    <div className="p-2">
      <FeedList />
    </div>
  );

  // Simple right panel for the all feeds view
  const rightPanelContent = (
    <div className="space-y-8 max-w-full overflow-x-hidden">
      <div className="p-1">
        <h3 className="text-2xl mb-4">All Submissions</h3>
        <div className="space-y-4">
          <div className="p-4 bg-white border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-shadow duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5">
            <p className="text-gray-600">
              This view shows all submissions across all feeds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout sidebar={sidebarContent} rightPanel={rightPanelContent}>
      <div className="space-y-4">
        <FeedHeader
          title="All Submissions"
          description="View all submissions across all feeds"
          items={items}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          feedName="all"
        />

        <InfiniteFeed
          items={items}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          status={status}
          loadingMessage="Loading more submissions..."
          noMoreItemsMessage="No more submissions to load"
          initialLoadingMessage="Loading submissions..."
          renderItems={(items) => (
            <SubmissionList
              items={items}
              statusFilter={statusFilter}
              botId={botId}
            />
          )}
        />
      </div>
    </Layout>
  );
}

export default FeedIndexPage;
