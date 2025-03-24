import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header";
import { Button } from "../../components/ui/button";
import SubmissionList from "../../components/SubmissionList";
import InfiniteFeed from "../../components/InfiniteFeed";
import { useBotId } from "../../lib/config";
import { useEffect } from "react";
import { useAllSubmissions } from "../../lib/api";
import { Status } from "../../components/StatusFilter";
import { Sort } from "../../components/Sort";
import { useFilterStore } from "../../store/useFilterStore";
import {
  SubmissionStatus,
  TwitterSubmissionWithFeedData,
} from "../../types/twitter";

export const Route = createFileRoute("/explore/")({
  component: ExplorePage,
});

type FeedSectionProps = {
  title: string;
  items: unknown[];
  fetchNextPage: () => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  status: string;
  statusFilter: string;
  botId: string;
  showAll?: boolean;
  showSort?: boolean;
  actionButton?: {
    label: string;
    onClick?: () => void;
  };
};

const FeedSection = ({
  title,
  items,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  status,
  statusFilter,
  botId,
  showAll = true,
  showSort = false,
  actionButton,
}: FeedSectionProps) => (
  <div className="w-full mx-auto p-4 gap-6 flex flex-col">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl leading-10">{title}</h2>
      <div className="flex gap-3">
        <Status />
        {showSort && <Sort />}
        {actionButton && (
          <Button variant="outline" onClick={actionButton.onClick}>
            {actionButton.label}
          </Button>
        )}
      </div>
    </div>
    <InfiniteFeed
      items={items as TwitterSubmissionWithFeedData[]}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      status={status as "pending" | "error" | "success"}
      showAll={showAll}
      loadingMessage="Loading more submissions..."
      noMoreItemsMessage="No more submissions to load"
      initialLoadingMessage="Loading submissions..."
      renderItems={(items: TwitterSubmissionWithFeedData[]) => (
        <SubmissionList
          items={items}
          statusFilter={statusFilter as "all" | SubmissionStatus}
          botId={botId}
        />
      )}
    />
  </div>
);

function ExplorePage() {
  const botId = useBotId();
  const { statusFilter } = useFilterStore();

  // Fetch submissions with infinite scroll
  const ITEMS_PER_PAGE = 20;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useAllSubmissions(
    ITEMS_PER_PAGE,
    statusFilter === "all" ? undefined : statusFilter,
  );

  useEffect(() => {
    refetch();
  }, [statusFilter, refetch]);

  const items = data?.items || [];

  const handleCreateFeed = () => {
    // Implement create feed functionality
    console.log("Create feed clicked");
  };

  const handleMyFeeds = () => {
    // Implement my feeds functionality
    console.log("My feeds clicked");
  };

  const handleViewAllFeeds = () => {
    // Implement view all feeds functionality
    console.log("View all feeds clicked");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 w-full px-16">
        {/* Hero section */}
        <div className="flex flex-col gap-7 items-center p-12 justify-center border-b border-neutral-300">
          <div className="max-w-[786px] flex flex-col">
            <h1 className="text-center text-5xl font-normal font-londrina leading-[63px]">
              Explore
            </h1>
            <p className="text-center text-2xl leading-10">
              Discover autonomous brands powered by curators and AI.
              <br /> Find feeds that match your interests and contribute to
              their growth.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateFeed}>Create Feed</Button>
            <Button variant="secondary" onClick={handleMyFeeds}>
              My Feeds
            </Button>
          </div>
        </div>

        {/* Recent Submissions Section */}
        <FeedSection
          title="Recent Submissions"
          items={items}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          status={status}
          statusFilter={statusFilter || ""}
          botId={botId}
          showAll={false}
          showSort={true}
        />

        {/* Feeds Section */}
        <FeedSection
          title="Feed"
          items={items}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          status={status}
          statusFilter={statusFilter || ""}
          botId={botId}
          actionButton={{
            label: "View All Feeds",
            onClick: handleViewAllFeeds,
          }}
        />
      </main>
    </div>
  );
}
