import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { useMyCreatedFeeds } from "../../../lib/api/feeds";
import { useNavigate } from "@tanstack/react-router";
import { FeedCard } from "./FeedCard";
import { SearchForm } from "./SearchForm";
import { filterOptions, type FilterValue } from "./constants";
import { useFilteredFeeds } from "./hooks/useFilteredFeeds";

export function MyFeeds() {
  const [open, setOpen] = useState(false);
  const [filterValue, setFilterValue] = useState<FilterValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { data: feeds = [], isLoading, error } = useMyCreatedFeeds();

  const filteredFeeds = useFilteredFeeds(feeds, searchTerm, filterValue);

  const handleCreateNewFeed = () => {
    navigate({ to: "/create/feed" });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-500">Failed to load feeds. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      <div className="flex flex-col md:flex-row md:gap-0 gap-4 items-stretch justify-between w-full">
        <SearchForm searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="ms-auto md:ms-0 flex items-stretch gap-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="truncate justify-between h-auto"
              >
                {filterValue
                  ? `${filterOptions.find((option) => option.value === filterValue)?.label} Feeds`
                  : "Select filter..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search feeds" />
                <CommandList>
                  <CommandEmpty>No filter found.</CommandEmpty>
                  <CommandGroup>
                    {filterOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                          setFilterValue(
                            currentValue === filterValue
                              ? "all"
                              : (currentValue as FilterValue),
                          );
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filterValue === option.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="filled"
            className="h-auto"
            onClick={handleCreateNewFeed}
          >
            Create New Feed
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your feeds...</span>
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-gray-500 mb-4">
            {searchTerm || filterValue !== "all"
              ? "No feeds match your search criteria."
              : "You haven't created any feeds yet."}
          </p>
          {!searchTerm && filterValue === "all" && (
            <Button variant="filled" onClick={handleCreateNewFeed}>
              Create Your First Feed
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {filteredFeeds.map((feed) => (
            <FeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}
    </div>
  );
}
