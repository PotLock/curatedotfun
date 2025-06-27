import type { FeedResponse } from "@curatedotfun/types";
import type { FilterValue } from "../constants";

export function useFilteredFeeds(
  feeds: FeedResponse[],
  searchTerm: string,
  filterValue: FilterValue,
) {
  return feeds.filter((feed) => {
    const matchesSearch =
      !searchTerm ||
      feed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feed.description &&
        feed.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Check if feed setup is complete based on config
    const isComplete = !!(
      feed.config &&
      feed.config.name &&
      feed.config.description &&
      feed.config.sources &&
      feed.config.sources.length > 0
    );

    if (filterValue === "all") return matchesSearch;
    if (filterValue === "completed") return matchesSearch && isComplete;
    if (filterValue === "incomplete") return matchesSearch && !isComplete;

    return matchesSearch;
  });
}
