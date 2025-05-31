import { FileRouteTypes, useNavigate, useSearch } from "@tanstack/react-router";
import { Filter, Search } from "lucide-react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { SortOrderType, StatusFilterType } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface FilterControlsProps {
  parentRouteId: FileRouteTypes["id"];
  totalItems?: number;
  isSearchActive?: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  parentRouteId,
  totalItems,
  isSearchActive,
}) => {
  const navigate = useNavigate();
  const {
    q: initialQ,
    status: initialStatus,
    sortOrder: initialSortOrder,
  } = useSearch({ from: parentRouteId });

  const [searchQuery, setSearchQuery] = useState(initialQ || "");
  const [status, setStatus] = useState<StatusFilterType>(initialStatus);
  const [sortOrder, setSortOrder] = useState<SortOrderType>(
    initialSortOrder || "newest",
  );
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  type TargetSearchSchema =
    FileRouteTypes["fileRoutesById"][typeof parentRouteId]["preLoaderRoute"]["validateSearch"]["_output"];

  useEffect(() => {
    // Sync local state when the URL search param changes externally
    setSearchQuery(initialQ || "");
    setStatus(initialStatus || undefined);
    setSortOrder(initialSortOrder || "newest");
  }, [initialQ, initialStatus, initialSortOrder]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchQuery(newValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      navigate({
        // @ts-expect-error tanstack router types are hard for a dynamic route
        search: (prev: TargetSearchSchema) => ({
          ...prev,
          q: newValue || undefined,
          // page: 1, // Optional: Reset page on filter change
        }),
        replace: true,
      });
    }, 300);
  };

  const handleApplyFiltersClick = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    console.log("status", status);
    navigate({
      // @ts-expect-error tanstack router types are hard for a dynamic route
      search: (prev: TargetSearchSchema) => ({
        ...prev,
        q: searchQuery || undefined,
        status: status === "all" ? undefined : status,
        sortOrder: sortOrder === "newest" ? undefined : sortOrder,
        // page: 1, // Optional: Reset page on filter change
      }),
      replace: true,
    });
    setShowFiltersDropdown(false);
  };

  useEffect(() => {
    // Cleanup debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const toggleFiltersDropdown = () => {
    setShowFiltersDropdown(!showFiltersDropdown);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex md:flex-row flex-col justify-between items-center gap-3 md:gap-6">
        <div className="relative flex-grow w-full md:w-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none max-h-[40px]">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search submissions..."
            className="pl-9 w-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          variant={"outline"}
          className="min-h-[40px] w-full md:w-auto"
          onClick={toggleFiltersDropdown}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {isSearchActive && typeof totalItems === "number" && (
        <p className="text-sm text-gray-600">
          Showing results for "{initialQ}" (Total: {totalItems}{" "}
          {totalItems === 1 ? "item" : "items"})
        </p>
      )}

      {showFiltersDropdown && (
        <div className="p-4 border rounded-md w-full gap-3 flex flex-col bg-card text-card-foreground">
          <div className="flex md:flex-row flex-col w-full justify-between items-center gap-6">
            <div className="w-full">
              <p className="text-sm font-medium mb-1">Sort By</p>
              <Select
                value={sortOrder}
                onValueChange={(val) => setSortOrder(val as SortOrderType)}
              >
                <SelectTrigger className="bg-input text-foreground">
                  <SelectValue placeholder="Most Recent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <p className="text-sm font-medium mb-1">Status</p>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as StatusFilterType)}
              >
                <SelectTrigger className="bg-input text-foreground">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"all"}>All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <Button onClick={handleApplyFiltersClick}>Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterControls;
