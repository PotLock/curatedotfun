import { useRef, useEffect, useCallback, ReactNode } from "react";

interface InfiniteFeedProps<T> {
  items: T[];
  renderItems: (items: T[]) => ReactNode;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  status: "pending" | "error" | "success";
  loadingMessage?: string;
  noMoreItemsMessage?: string;
  initialLoadingMessage?: string;
  showAll?: boolean; // New prop to control showing all or limited items
}

function InfiniteFeed<T>({
  items,
  renderItems,
  fetchNextPage,
  hasNextPage = false,
  isFetchingNextPage,
  status,
  loadingMessage = "Loading more items...",
  noMoreItemsMessage = "No more items to load",
  initialLoadingMessage = "Loading items...",
  showAll = true, // Default to showing all items
}: InfiniteFeedProps<T>) {
  // Create an intersection observer to detect when user scrolls to bottom
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    // Only set up the observer if we're showing all items
    if (!showAll) return;

    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px", // Start loading a bit earlier
      threshold: 0.1, // Trigger when just 10% of the element is visible
    });

    observer.observe(element);
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [handleObserver, showAll]);

  // Determine which items to render
  const itemsToRender = showAll ? items : items.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4">
      {renderItems(itemsToRender)}

      {/* Loading indicator and observer target - only shown when showAll is true */}
      {showAll && (
        <div ref={observerTarget} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <div className="text-gray-500">{loadingMessage}</div>
          )}
          {!hasNextPage && items.length > 0 && !isFetchingNextPage && (
            <div className="text-gray-500">{noMoreItemsMessage}</div>
          )}
          {status === "pending" && items.length === 0 && (
            <div className="text-gray-500">{initialLoadingMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default InfiniteFeed;
