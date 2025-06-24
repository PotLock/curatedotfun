import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import FeedList from "../../components/FeedList";
import { Hero } from "../../components/Hero";
import TopCurators from "../../components/feed/top-curators";
import {
  submissionSearchSchema,
  useAllSubmissions,
  SubmissionFilters,
} from "../../lib/api";
import FilterControls from "../../components/FilterControls";
import InfiniteFeed from "../../components/InfiniteFeed";
import SubmissionList from "../../components/SubmissionList";

export const Route = createFileRoute("/_layout/")({
  validateSearch: (search) => submissionSearchSchema.parse(search),
  component: HomePage,
});

function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);
  const searchParams = useSearch({ from: Route.id }) as SubmissionFilters;
  const apiFilters: SubmissionFilters = {
    status: searchParams.status,
    sortOrder: searchParams.sortOrder || "newest",
    q: searchParams.q || "",
  };
  const queryResult = useAllSubmissions(apiFilters);
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
  const displayTitle = "All Submissions";

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  return (
    <>
      <Hero
        title="Explore"
        description="Discover autonomous brands powered by curators and AI"
      />

      {/* Mobile Navigation Controls */}
      <div className="flex justify-between items-center px-4 pt-3 md:hidden">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md flex bg-gray-100 hover:bg-gray-200"
          aria-label="Toggle feeds menu"
        >
          <Menu size={24} />
          <span className="ml-2 font-medium">Feeds</span>
        </button>
        <button
          onClick={toggleCurators}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
          aria-label="Toggle curators"
        >
          <span className="mr-2 font-medium">Curators</span>
        </button>
      </div>

      {/* Mobile Sidebar - Feed List (Slide in from left) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
      />
      <div
        className={`fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">Feeds</h3>
          <button onClick={toggleMobileMenu} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <FeedList />
        </div>
      </div>

      {/* Mobile Curators Panel (Slide in from right) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${
          mobileCuratorsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleCurators}
      />
      <div
        className={`fixed top-0 right-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${
          mobileCuratorsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">Top Curators</h3>
          <button onClick={toggleCurators} aria-label="Close curators">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <TopCurators />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-4 md:max-w-screen-2xl mx-auto gap-4 lg:gap-8 overflow-hidden px-4 lg:px-8">
        {/* Left Sidebar - Feed List (Desktop) */}
        <div className="col-span-1 overflow-y-auto">
          <FeedList />
        </div>

        {/* Main Content Area */}
        <div className="col-span-2">
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
                  // feedId is not applicable for "All Submissions"
                  allowModerationControls={false} // Or based on some other logic if needed
                />
              )}
            />
          </div>
        </div>

        {/* Right Panel - Feed Details */}
        <div className="col-span-1 bg-white overflow-y-auto">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <h3 className="text-[32px] font-normal leading-[63px]">
                Top Curator
              </h3>
              <TopCurators />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden px-4">
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
                allowModerationControls={false}
              />
            )}
          />
        </div>
      </div>
    </>
  );
}
