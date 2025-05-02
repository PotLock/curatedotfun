import { createFileRoute } from "@tanstack/react-router";
import SubmissionsLayout from "../../components/SubmissionsLayout";
import FeedList from "../../components/FeedList";
import { useBotId } from "../../lib/config";

import { useState, useEffect } from "react";
import { useAllSubmissions } from "../../lib/api";
import InfiniteFeed from "../../components/InfiniteFeed";
import SubmissionList from "../../components/SubmissionList";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Filter, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  useFeedFilterStore,
  StatusFilterType,
  SortOrderType,
} from "../../store/useFeedFilterStore";

export const Route = createFileRoute("/submissions/")({
  component: SubmissionsIndexPage,
});

function SubmissionsIndexPage() {
  const botId = useBotId();

  // Get global filter state from Zustand
  const { statusFilter, sortOrder, setStatusFilter, setSortOrder } =
    useFeedFilterStore();

  // Local filter state (before applying)
  const [localStatusFilter, setLocalStatusFilter] =
    useState<StatusFilterType>(statusFilter);
  const [localSortOrder, setLocalSortOrder] =
    useState<SortOrderType>(sortOrder);
  const [localPlatform, setLocalPlatform] = useState("twitter");

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query to avoid excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch submissions with infinite scroll
  const ITEMS_PER_PAGE = 20;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useAllSubmissions(
      ITEMS_PER_PAGE,
      statusFilter === "all" ? undefined : statusFilter,
    );

  // Get the items from the transformed data
  const items = data?.items || [];

  // Sort items based on sort order
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.submittedAt || 0).getTime();
    const dateB = new Date(b.submittedAt || 0).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });
  
  // Filter items based on search query
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

  const sidebarContent = (
    <div className="">
      <FeedList />
    </div>
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Apply filters
  const applyFilters = () => {
    setStatusFilter(localStatusFilter);
    setSortOrder(localSortOrder);
    setShowFilters(false);
  };

  return (
    <SubmissionsLayout leftSidebar={sidebarContent}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex md:flex-row flex-col justify-between items-center gap-6">
          <h1 className="text-[32px] leading-[63px] font-normal">
            Submissions
          </h1>
          <div className="flex gap-3 items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none max-h-[40px]">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search"
                className="pl-9"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button
              variant={"outline"}
              className="min-h-[40px]"
              onClick={toggleFilters}
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
                  value={localSortOrder}
                  onValueChange={(val) =>
                    setLocalSortOrder(val as SortOrderType)
                  }
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
                <Select value={localPlatform} onValueChange={setLocalPlatform}>
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
                  value={localStatusFilter}
                  onValueChange={(val) =>
                    setLocalStatusFilter(val as StatusFilterType)
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
          items={filteredItems}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage && debouncedSearchQuery.trim() === ""}
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
    </SubmissionsLayout>
  );
}
