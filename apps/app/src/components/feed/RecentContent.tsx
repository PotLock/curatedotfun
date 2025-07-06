import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRssFeed } from "@/hooks/use-rss-feed";
import { FeedCard } from "./FeedCard";

interface RecentContentProps {
  feedId: string;
  feedName: string;
  feedImage?: string;
}

export function RecentContent({
  feedId,
  feedName,
  feedImage,
}: RecentContentProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const { hasRssFeed, rssData, isLoading, isError } = useRssFeed(feedId);

  // Get recent items (latest 9 items, 3 pages of 3 items each)
  const recentItems = useMemo(() => {
    if (!rssData || rssData.length === 0) return [];

    // Sort by date (most recent first) and take first 9 items
    const sortedItems = [...rssData]
      .sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      )
      .slice(0, 9);

    // Group into pages of 3
    const pages = [];
    for (let i = 0; i < sortedItems.length; i += 3) {
      pages.push(sortedItems.slice(i, i + 3));
    }

    return pages;
  }, [rssData]);

  const maxPages = recentItems.length;

  const handlePrevious = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : maxPages - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev < maxPages - 1 ? prev + 1 : 0));
  };

  // Don't render if no RSS feed or no data
  if (!hasRssFeed || isLoading || isError || recentItems.length === 0) {
    return null;
  }

  const currentItems = recentItems[currentPage] || [];

  return (
    <div className="space-y-4">
      {/* Header with Navigation - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="leading-8 text-xl sm:text-[24px] font-semibold">
          Recent Content
        </h3>
        {maxPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="h-8 w-8 p-3"
              aria-label="Previous page"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 p-3"
              aria-label="Next page"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.map((item, index) => (
          <FeedCard
            key={item.guid || `${currentPage}-${index}`}
            item={item}
            feedName={feedName}
            feedId={feedId}
            feedImage={feedImage}
          />
        ))}
      </div>
    </div>
  );
}
