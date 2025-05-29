import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, X, Filter, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { z } from "zod";

import FeedList from "../../components/FeedList";
import TopCurators from "../../components/TopCurators";
import { Hero } from "../../components/Hero";
import { useBotId } from "../../lib/config";
import { useAllSubmissions } from "../../lib/api";
import InfiniteFeed from "../../components/InfiniteFeed";
import SubmissionList from "../../components/SubmissionList";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  StatusFilterType,
  SortOrderType,
} from "../../store/useFeedFilterStore";
import { SubmissionWithFeedData } from "../../types/twitter";

const homePageSearchSchema = z.object({
  status: z.string().optional(), // TODO: StatusFilterType
  sortOrder: z.enum(["newest", "oldest"]).optional(), // TODO: SortOrderType
  platform: z.string().optional(), // TODO: SupportPlatform
  q: z.string().optional(),
});

export const Route = createFileRoute("/_layout/")({
  validateSearch: homePageSearchSchema,
  component: HomePage,
});

function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);
  const layoutTitleText = "Top Curators"; // Renamed to avoid conflict

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  const botId = useBotId();
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Local UI state for filters before applying via URL
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>(
    searchParams.status as StatusFilterType || "all",
  );
  const [sortOrder, setSortOrder] = useState<SortOrderType>(
    (searchParams.sortOrder as SortOrderType) || "newest",
  );
  const [platformFilter, setPlatformFilter] = useState(
    searchParams.platform || "twitter",
  );
  const [uiSearchQuery, setUiSearchQuery] = useState(searchParams.q || "");

  const [showFilters, setShowFilters] = useState(false);

  // Debounced search query from URL for fetching/filtering
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.q || "");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchParams.q || "");
    }, 300); // Debounce based on URL change, not UI input directly
    return () => clearTimeout(timer);
  }, [searchParams.q]);


  const ITEMS_PER_PAGE = 20;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status: fetchStatus } =
    useAllSubmissions(
      ITEMS_PER_PAGE,
      searchParams.status === "all" ? undefined : (searchParams.status as StatusFilterType),
      // Pass other params like sortOrder to API if supported, otherwise sort client-side
    );

  const items = data?.items || [];

  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.submittedAt || 0).getTime();
    const dateB = new Date(b.submittedAt || 0).getTime();
    return (searchParams.sortOrder || "newest") === "newest" ? dateB - dateA : dateA - dateB;
  });

  const filteredItems =
    debouncedSearchQuery.trim() !== ""
      ? sortedItems.filter(
          (item) =>
            item.content
              ?.toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase()) ||
            item.curatorUsername
              ?.toLowerCase()
              .includes(debouncedSearchQuery.toLowerCase()),
        )
      : sortedItems;

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUiSearchQuery(e.target.value);
  };

  const handleSearchSubmit = () => { // Or on blur, or debounced from UI
    navigate({
      search: (prev) => ({ ...prev, q: uiSearchQuery || undefined }),
      replace: true,
    });
  };
  
  // Effect to trigger search submit on UI query change after debounce
  useEffect(() => {
    const identifier = setTimeout(() => {
      if (uiSearchQuery !== (searchParams.q || "")) { // Only navigate if different
        handleSearchSubmit();
      }
    }, 500); // Adjust debounce time as needed
    return () => clearTimeout(identifier);
  }, [uiSearchQuery, searchParams.q]);


  const toggleFiltersDropdown = () => {
    setShowFilters(!showFilters);
  };

  const applyFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortOrder: sortOrder === "newest" ? undefined : sortOrder,
        platform: platformFilter === "twitter" ? undefined : platformFilter,
      }),
      replace: true,
    });
    setShowFilters(false);
  };

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
          <h3 className="font-medium text-lg">{layoutTitleText}</h3>
          <button onClick={toggleCurators} aria-label="Close curators">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <h3 className="text-[32px] font-normal leading-[63px]">
                {layoutTitleText}
              </h3>
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
          <div className="flex-1 overflow-y-auto h-full">
            <div>
              {/* Submission Feed */}
              <div className="flex flex-col gap-6 w-full py-4"> 
                <div className="flex md:flex-row flex-col justify-between items-center gap-6">
                  <h1 className="text-[32px] leading-[63px] font-normal">Submissions</h1>
                  <div className="flex gap-3 w-full items-center">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none max-h-[40px]">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search"
                        className="pl-9 w-full"
                        value={uiSearchQuery}
                        onChange={handleSearchInputChange}
                        // onBlur={handleSearchSubmit} // Or use debounced effect
                      />
                    </div>
                    <Button
                      variant={"outline"}
                      className="min-h-[40px]"
                      onClick={toggleFiltersDropdown}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Filters
                    </Button>
                  </div>
                </div>

                {debouncedSearchQuery.trim() !== "" && (
                  <p className="text-sm text-gray-600">
                    Showing results for "{debouncedSearchQuery}" ({filteredItems.length}{" "}
                    {filteredItems.length === 1 ? "item" : "items"})
                  </p>
                )}

                {showFilters && (
                  <div className=" p-4 border rounded-md w-full gap-3 flex flex-col">
                    <div className="flex md:flex-row flex-col w-full justify-between items-center gap-6">
                      <div className="w-full">
                        <p className="text-sm font-medium">Sort By</p>
                        <Select
                          value={sortOrder}
                          onValueChange={(val) => setSortOrder(val as SortOrderType)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Most Recent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Most Recent</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full">
                        <p className=" text-sm font-medium">Platform</p>
                        <Select value={platformFilter} onValueChange={setPlatformFilter}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Twitter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="twitter">Twitter</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full">
                        <p className=" text-sm font-medium">Status</p>
                        <Select
                          value={statusFilter}
                          onValueChange={(val) =>
                            setStatusFilter(val as StatusFilterType)
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        className="bg-black text-white hover:bg-gray-800"
                        onClick={applyFilters}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                )}

                <InfiniteFeed
                  items={filteredItems as SubmissionWithFeedData[]}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage && debouncedSearchQuery.trim() === ""}
                  isFetchingNextPage={isFetchingNextPage}
                  status={fetchStatus}
                  loadingMessage="Loading more submissions..."
                  noMoreItemsMessage="No more submissions to load"
                  initialLoadingMessage="Loading submissions..."
                  renderItems={(renderableItems) => (
                    <SubmissionList
                      items={renderableItems}
                      statusFilter={(searchParams.status as StatusFilterType) || "all"}
                      botId={botId}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Feed Details */}
        <div className="col-span-1 bg-white overflow-y-auto">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <h3 className="text-[32px] font-normal leading-[63px]">
                {layoutTitleText}
              </h3>
              <TopCurators />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden px-4">
        <div className="flex-1 overflow-y-auto">
          {/* Submission List */}
          <div className="flex flex-col gap-6 w-full py-4">
            <div className="flex md:flex-row flex-col justify-between items-center gap-6">
              <h1 className="text-[32px] leading-[63px] font-normal">Submissions</h1>
              <div className="flex gap-3 w-full items-center">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none max-h-[40px]">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search"
                    className="pl-9"
                    value={uiSearchQuery}
                    onChange={handleSearchInputChange}
                    // onBlur={handleSearchSubmit} // Or use debounced effect
                  />
                </div>
                <Button
                  variant={"outline"}
                  className="min-h-[40px]"
                  onClick={toggleFiltersDropdown}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>

            {debouncedSearchQuery.trim() !== "" && (
              <p className="text-sm text-gray-600">
                Showing results for "{debouncedSearchQuery}" ({filteredItems.length}{" "}
                {filteredItems.length === 1 ? "item" : "items"})
              </p>
            )}

            {showFilters && (
              <div className=" p-4 border rounded-md w-full gap-3 flex flex-col">
                <div className="flex md:flex-row flex-col w-full justify-between items-center gap-6">
                  <div className="w-full">
                    <p className="text-sm font-medium">Sort By</p>
                    <Select
                      value={sortOrder}
                      onValueChange={(val) => setSortOrder(val as SortOrderType)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Most Recent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Most Recent</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full">
                    <p className=" text-sm font-medium">Platform</p>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Twitter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full">
                    <p className=" text-sm font-medium">Status</p>
                    <Select
                      value={statusFilter}
                      onValueChange={(val) =>
                        setStatusFilter(val as StatusFilterType)
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}

            <InfiniteFeed
              items={filteredItems as SubmissionWithFeedData[]}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage && debouncedSearchQuery.trim() === ""}
              isFetchingNextPage={isFetchingNextPage}
              status={fetchStatus}
              loadingMessage="Loading more submissions..."
              noMoreItemsMessage="No more submissions to load"
              initialLoadingMessage="Loading submissions..."
              renderItems={(renderableItems) => (
                <SubmissionList
                  items={renderableItems}
                  statusFilter={(searchParams.status as StatusFilterType) || "all"}
                  botId={botId}
                />
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
}
