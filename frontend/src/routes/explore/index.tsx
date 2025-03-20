import { createFileRoute } from "@tanstack/react-router";
import Header from "../../components/Header"; // Adjust based on your project structure
import { Button } from "../../components/ui/button";
// import RecentTokenLaunches from "../../components/RecentLaunches";
import SubmissionList from "../../components/SubmissionList";
import InfiniteFeed from "../../components/InfiniteFeed";
import { useBotId } from "../../lib/config";
import { useEffect, useState } from "react";
import { TwitterSubmission } from "../../types/twitter";
import { useAllSubmissions } from "../../lib/api";
import { Status } from "../../components/StatusFilter";
import { Sort } from "../../components/Sort";

export const Route = createFileRoute("/explore/")({
  component: ExplorePage,
});

function ExplorePage() {
  const botId = useBotId();
  const [statusFilter] = useState<"all" | TwitterSubmission["status"]>("all");

  // Fetch submissions with infinite scroll
  const ITEMS_PER_PAGE = 20;
  // const SUBMISSION_PER_PAGE = 3;
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

  return (
    <div className="">
      <Header /> {/* Include the header component */}
      <main className="py-12 w-full px-16">
        <div className="flex flex-col gap-7 items-center p-12 justify-center border-b border-[--neutral-300, #D4D4D4]">
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
            <Button>Create Feed</Button>
            <Button variant="secondary">My Feeds</Button>
          </div>
        </div>
        {/* <div>
          <RecentTokenLaunches />
        </div> */}
        <div className="w-full mx-auto p-4 gap-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl  leading-10 ">Recent Submissions</h2>
            <div className="flex gap-3">
              <Status />
              <Sort />
            </div>
          </div>
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
      </main>
    </div>
  );
}
