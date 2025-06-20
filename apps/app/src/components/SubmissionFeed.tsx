import { FileRouteTypes, useSearch } from "@tanstack/react-router";
import { SubmissionFilters, useAllSubmissions, useFeedItems } from "../lib/api";
import FilterControls from "./FilterControls";
import InfiniteFeed from "./InfiniteFeed";
import SubmissionList from "./SubmissionList";

interface SubmissionFeedProps {
  parentRouteId: FileRouteTypes["id"];
  feedId?: string;
  title?: string;
}

export default function SubmissionFeed({
  parentRouteId,
  feedId,
  title,
}: SubmissionFeedProps) {
  const searchParams = useSearch({ from: parentRouteId }) as SubmissionFilters;

  const apiFilters: SubmissionFilters = {
    status: searchParams.status,
    sortOrder: searchParams.sortOrder || "newest",
    q: searchParams.q || "",
  };

  const feedItemsResult = useFeedItems(feedId!, apiFilters);
  const allSubmissionsResult = useAllSubmissions(apiFilters);

  const queryResult = feedId ? feedItemsResult : allSubmissionsResult;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: fetchStatus,
  } = queryResult;

  const items = data?.items || [];
  const lastPageData =
    data?.pages && data.pages.length > 0
      ? data.pages[data.pages.length - 1]
      : null;
  const totalItems = lastPageData?.pagination?.totalCount ?? items.length;
  const displayTitle =
    title || (feedId ? `Submissions for ${feedId}` : "All Submissions");

  return (
    <div className="flex flex-col gap-6 w-full py-4">
      <div className="flex md:flex-row flex-col justify-between items-center gap-6">
        <h1 className="text-[24px] md:text-[32px] leading-[63px] font-normal">
          {displayTitle}
        </h1>
      </div>

      <FilterControls
        parentRouteId={parentRouteId}
        totalItems={totalItems}
        isSearchActive={!!searchParams.q && searchParams.q.trim() !== ""}
      />

      <InfiniteFeed
        items={items}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        status={fetchStatus}
        loadingMessage="Loading more submissions..."
        noMoreItemsMessage="No more submissions to load"
        initialLoadingMessage="Loading submissions..."
        renderItems={(renderableItems) => (
          <SubmissionList
            items={renderableItems}
            feedId={feedId}
            allowModerationControls={!!feedId}
          />
        )}
      />
    </div>
  );
}
