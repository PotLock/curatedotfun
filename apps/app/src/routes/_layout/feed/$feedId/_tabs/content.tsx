import { useRssFeed } from "@/hooks/use-rss-feed";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { RssFeedItem } from "@/components/rss-feed/RssFeedItem";
import { FilterControls } from "@/components/rss-feed/FilterControls";
import { FilterBadges } from "@/components/rss-feed/FilterBadges";

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs/content")({
  component: RouteComponent,
});

function RouteComponent() {
  const { feedId } = Route.useParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  const { hasRssFeed, rssData, isLoading, isError, error } = useRssFeed(feedId);

  const filteredAndSortedData = useMemo(() => {
    let filtered = rssData;

    // Apply platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter((item) => item.platform === platformFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.categories?.includes(categoryFilter),
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();

      if (sortBy === "recent") {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    return filtered;
  }, [rssData, platformFilter, categoryFilter, sortBy]);

  // Get unique categories from all RSS data
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    rssData.forEach((item) => {
      if (item.categories) {
        item.categories.forEach((cat) => categories.add(cat));
      }
    });
    return Array.from(categories).sort();
  }, [rssData]);

  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSortBy("recent");
    setPlatformFilter("all");
    setCategoryFilter("all");
    setShowFilters(false);
  };

  const handleCategoryClick = (category: string) => {
    setCategoryFilter(category);
    setShowFilters(false);
  };

  // Get active filters for badges
  const activeFilters = useMemo(() => {
    const filters = [];
    if (platformFilter !== "all") {
      filters.push({
        type: "platform",
        value: platformFilter,
        label: `Platform: ${platformFilter}`,
      });
    }
    if (categoryFilter !== "all") {
      filters.push({
        type: "category",
        value: categoryFilter,
        label: `Category: ${categoryFilter}`,
      });
    }
    if (sortBy !== "recent") {
      filters.push({ type: "sort", value: sortBy, label: `Sort: ${sortBy}` });
    }
    return filters;
  }, [platformFilter, categoryFilter, sortBy]);

  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case "platform":
        setPlatformFilter("all");
        break;
      case "category":
        setCategoryFilter("all");
        break;
      case "sort":
        setSortBy("recent");
        break;
    }
  };

  // Setup window virtualization
  React.useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: filteredAndSortedData.length,
    estimateSize: () => 150, // Estimated height of each RSS item
    overscan: 5,
    scrollMargin: parentOffsetRef.current,
  });

  if (!hasRssFeed) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">
          This feed doesn't have an RSS feed configured.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading RSS feed...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Error loading RSS feed: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header with Title and Filter Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Recent Content</h2>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="min-h-[40px] relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilters.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </div>

      {/* Active Filter Badges */}
      <FilterBadges
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
        onClearAll={resetFilters}
      />

      {/* Filter Controls */}
      <FilterControls
        showFilters={showFilters}
        sortBy={sortBy}
        platformFilter={platformFilter}
        categoryFilter={categoryFilter}
        availableCategories={availableCategories}
        onSortChange={(val) => setSortBy(val)}
        onPlatformChange={setPlatformFilter}
        onCategoryChange={setCategoryFilter}
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
      />

      {/* Virtualized RSS Feed List */}
      {filteredAndSortedData.length === 0 ? (
        <p className="text-gray-600 text-center">No RSS feed items found.</p>
      ) : (
        <div ref={parentRef}>
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = filteredAndSortedData[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                    paddingBottom: "1rem", // Add spacing between items
                  }}
                >
                  <RssFeedItem
                    item={item}
                    onCategoryClick={handleCategoryClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
