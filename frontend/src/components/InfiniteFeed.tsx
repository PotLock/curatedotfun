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
  }, [handleObserver]);

  return (
    <div className="space-y-4">
      {renderItems(items)}

      {/* Loading indicator and observer target */}
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
    </div>
  );
}

export default InfiniteFeed;
