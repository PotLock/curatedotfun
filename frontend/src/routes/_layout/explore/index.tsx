import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import InfiniteFeed from "../../../components/InfiniteFeed";
import { Sort } from "../../../components/Sort";
import { StatusFilter } from "../../../components/StatusFilter";
import SubmissionList from "../../../components/SubmissionList";
import { Button } from "../../../components/ui/button";
import { useAllSubmissions } from "../../../lib/api";
import { useBotId } from "../../../lib/config";

import {
  StatusFilterType,
  useFilterStore,
} from "../../../store/useFilterStore";
import {
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../../../types/twitter";

import { Container } from "../../../components/Container";
import { Hero } from "../../../components/Hero";
import { useFeedFilterStore } from "../../../store/useFeedFilterStore";

export const Route = createFileRoute("/_layout/explore/")({
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
  layout: "flex" | "grid";
  actionButton?: {
    label: string;
    onClick?: () => void;
  };

  setStatusFilter: (status: StatusFilterType) => void;
};

export const FeedSection = ({
  title,
  items,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  status,
  statusFilter,
  botId,
  layout,

  setStatusFilter,

  showAll = true,
  showSort = false,
  actionButton,
}: FeedSectionProps) => (
  <div className="w-full  mx-auto py-4 md:p-4 gap-6 flex flex-col">
    <div className="flex items-center justify-between">
      <h2 className="md:text-2xl text-lg leading-5 md:leading-10">{title}</h2>
      <div className="flex gap-3">
        <StatusFilter
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {showSort && <Sort />}
        {actionButton && (
          <Button variant="outline" onClick={actionButton.onClick}>
            {actionButton.label}
          </Button>
        )}
      </div>
    </div>
    <InfiniteFeed
      items={items as SubmissionWithFeedData[]}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      status={status as "pending" | "error" | "success"}
      showAll={showAll}
      loadingMessage="Loading more submissions..."
      noMoreItemsMessage="No more submissions to load"
      initialLoadingMessage="Loading submissions..."
      renderItems={(items: SubmissionWithFeedData[]) => (
        <SubmissionList
          items={items}
          statusFilter={statusFilter as "all" | SubmissionStatus}
          botId={botId}
          layout={layout}
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
    <main className="py-0  md:pb-12 w-full md:px-0">
      <Hero
        title="Explore"
        description="Discover autonomous brands powered by curators and AI. Find feeds that match your interests and contribute to their growth."
        buttons={[
          {
            text: "Create Feed",
            link: "/create/feed",
          },
          {
            text: "Submissions",
            link: "/submissions",
            variant: "secondary",
          },
        ]}
      />
      <Container>
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
          layout={"flex"}
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
          layout={"flex"}
          actionButton={{
            label: "View All Feeds",
          }}
        />
      </Container>
    </main>
  );
}
