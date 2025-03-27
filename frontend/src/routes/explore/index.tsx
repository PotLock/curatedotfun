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

import { StatusFilterType, useFilterStore } from "../../store/useFilterStore";
import {
  SubmissionStatus,
  TwitterSubmissionWithFeedData,
} from "../../types/twitter";

import { useFeedFilterStore } from "../../store/useFeedFilterStore";

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

  setStatusFilter: (status: StatusFilterType) => void;
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

  setStatusFilter,

  showAll = true,
  showSort = false,
  actionButton,
}: FeedSectionProps) => (
  <div className="w-full mx-auto py-4 md:p-4 gap-6 flex flex-col">
    <div className="flex items-center justify-between">
      <h2 className="md:text-2xl text-lg leading-5 md:leading-10">{title}</h2>
      <div className="flex gap-3">
        <Status statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

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

  const { statusFilter, setStatusFilter } = useFilterStore();
  const {
    statusFilter: feedStatusFilter,
    setStatusFilter: setFeedStatusFilter,
  } = useFeedFilterStore();

  // Fetch submissions for Recent Submissions
  const ITEMS_PER_PAGE = 20;
  const {
    data: recentSubmissionsData,
    fetchNextPage: fetchNextRecentPage,
    hasNextPage: hasNextRecentPage,
    isFetchingNextPage: isFetchingNextRecentPage,
    status: recentStatus,
    refetch: refetchRecent,
  } = useAllSubmissions(
    ITEMS_PER_PAGE,
    statusFilter === "all" ? undefined : statusFilter,
  );

  // Fetch submissions for Feed
  const {
    data: feedData,
    fetchNextPage: fetchNextFeedPage,
    hasNextPage: hasNextFeedPage,
    isFetchingNextPage: isFetchingNextFeedPage,
    status: feedStatus,
    refetch: refetchFeed,
  } = useAllSubmissions(
    ITEMS_PER_PAGE,
    feedStatusFilter === "all" ? undefined : feedStatusFilter,
  );

  useEffect(() => {
    refetchRecent();
  }, [statusFilter, refetchRecent]);

  useEffect(() => {
    refetchFeed();
  }, [feedStatusFilter, refetchFeed]);

  const recentItems = recentSubmissionsData?.items || [];
  const feedItems = feedData?.items || [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-6 px-6 md:py-12 w-full md:px-16">
        {/* Hero section */}
        <div className="flex flex-col gap-7 items-center p-12 justify-center border-b border-neutral-300">
          <div className="max-w-[786px] flex flex-col">
            <h1 className="text-center text-4xl md:text-5xl font-normal font-londrina leading-[63px]">
              Explore
            </h1>
            <p className="text-center text-lg md:text-2xl leading-7 md:leading-10">
              Discover autonomous brands powered by curators and AI.
              <br /> Find feeds that match your interests and contribute to
              their growth.
            </p>
          </div>
          <div className="flex gap-3">
            <Button>Create Feed</Button>
            <Button variant="secondary">My Feeds</Button>
          </div>
        </div>

        {/* Recent Submissions Section */}
        <FeedSection
          title="Recent Submissions"
          items={recentItems}
          fetchNextPage={fetchNextRecentPage}
          hasNextPage={hasNextRecentPage}
          isFetchingNextPage={isFetchingNextRecentPage}
          status={recentStatus}
          statusFilter={statusFilter || ""}
          setStatusFilter={setStatusFilter}
          botId={botId}
          showAll={false}
          showSort={true}
        />

        {/* Feeds Section */}
        <FeedSection
          title="Feed"
          items={feedItems}
          fetchNextPage={fetchNextFeedPage}
          hasNextPage={hasNextFeedPage}
          isFetchingNextPage={isFetchingNextFeedPage}
          status={feedStatus}
          statusFilter={feedStatusFilter || ""}
          setStatusFilter={setFeedStatusFilter}
          botId={botId}
          actionButton={{
            label: "View All Feeds",
          }}
        />
      </main>
    </div>
  );
}
