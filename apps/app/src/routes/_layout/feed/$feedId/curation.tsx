import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  submissionSearchSchema,
  useFeedItems,
  SubmissionFilters,
} from "../../../../lib/api";
import FilterControls from "../../../../components/FilterControls";
import InfiniteFeed from "../../../../components/InfiniteFeed";
import SubmissionList from "../../../../components/SubmissionList";
import type { FeedContextSubmission } from "@curatedotfun/types";

export const Route = createFileRoute("/_layout/feed/$feedId/curation")({
  validateSearch: (search) => submissionSearchSchema.parse(search),
  component: FeedCurationPage,
});

function FeedCurationPage() {
  const { feedId } = Route.useParams();
  const searchParams = useSearch({ from: Route.id });
  const apiFilters: SubmissionFilters = {
    status: searchParams.status,
    sortOrder: searchParams.sortOrder || "newest",
    q: searchParams.q || "",
  };
  const queryResult = useFeedItems(feedId, apiFilters);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: fetchStatus,
  } = queryResult;

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const lastPageData =
    data?.pages && data.pages.length > 0
      ? data.pages[data.pages.length - 1]
      : null;
  const totalItems = lastPageData?.pagination?.totalCount ?? items.length;
  const displayTitle = "Recent Curation";

  return (
    <div className="flex flex-col gap-6 w-full py-4">
      <div className="flex md:flex-row flex-col justify-between items-center gap-6">
        <h1 className="text-[24px] md:text-[32px] leading-[63px] font-normal">
          {displayTitle}
        </h1>
      </div>

      <FilterControls
        parentRouteId={Route.id}
        totalItems={totalItems}
        isSearchActive={!!searchParams.q && searchParams.q.trim() !== ""}
      />

      <InfiniteFeed
        items={items as FeedContextSubmission[]} // Cast items to the correct type
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
            allowModerationControls={!!feedId} // Moderation controls are allowed here
          />
        )}
      />
    </div>
  );
}

export default FeedCurationPage;
