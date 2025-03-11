import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaCheck, FaCopy } from "react-icons/fa";

// Define the HashtagButton type
type HashtagButton = {
  tag: string;
  isActive?: boolean;
  onClick?: () => void;
};

// Define the Feed type to match the backend API
interface Feed {
  id: string;
  name: string;
  description: string;
  moderation?: any;
  outputs?: any;
}

/**
 * Fetches feeds from the API
 */
const fetchFeeds = async (): Promise<Feed[]> => {
  // Determine the API URL based on environment
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://curatedotfun-floral-sun-1539.fly.dev"
      : "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/config/feeds`);

  if (!response.ok) {
    throw new Error(`Failed to fetch feeds: ${response.status}`);
  }

  return await response.json();
};

const HashtagButton = ({ tag, isActive, onClick }: HashtagButton) => {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only show client-side features after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(`!submit @curatedotfun #${tag}`)
      .then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        () => {
          console.error("Failed to copy text to clipboard");
        },
      )
      .catch((error) => {
        console.error("Failed to copy text to clipboard", error);
      });
  };

  return (
    <button className="relative" onClick={onClick}>
      <div
        className={`
          px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
          ${
            isActive
              ? "bg-gray-500 text-white"
              : "bg-white hover:bg-gray-100 border border-gray-200"
          }
        `}
      >
        <span>#{tag}</span>
        {isActive && <span className="text-gray-300">▼</span>}
      </div>
      {/* Only render dropdown after component is mounted */}
      {mounted && isActive && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-50 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              !submit @curatedotfun #{tag}
            </p>
            <button
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded transition-colors"
              onClick={handleCopy}
            >
              {copied ? (
                <FaCheck className="text-green-500" />
              ) : (
                <FaCopy className="text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() =>
              window.open(`https://app.curate.fun/feed/${tag}`, "_blank")
            }
          >
            Open Feed
          </button>
        </div>
      )}
    </button>
  );
};

const PopularFeeds = () => {
  const [activeHashtag, setActiveHashtag] = useState("");

  // Use React Query to fetch and cache the feeds
  const {
    data: feeds,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["feeds"],
    queryFn: fetchFeeds,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  if (isLoading) {
    return (
      <section className="w-full bg-white">
        <div className="w-full max-w-7xl mx-auto py-8 md:py-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
            Popular Feeds
          </h2>
          <div className="flex justify-center">
            <p>Loading feeds...</p>
          </div>
        </div>
        <div className="w-full border-t border-black"></div>
      </section>
    );
  }

  if (isError || !feeds) {
    return (
      <section className="w-full bg-white">
        <div className="w-full max-w-7xl mx-auto py-8 md:py-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
            Popular Feeds
          </h2>
          <div className="flex justify-center">
            <p className="text-red-500">
              Failed to load feeds. Please try again later.
            </p>
          </div>
        </div>
        <div className="w-full border-t border-black"></div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white">
      <div className="w-full max-w-7xl mx-auto py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">
          Popular Feeds
        </h2>

        <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
          {feeds?.map((feed) => (
            <HashtagButton
              key={feed.id}
              tag={feed.id.replace("#", "")}
              isActive={activeHashtag === feed.id.replace("#", "")}
              onClick={() =>
                setActiveHashtag(
                  activeHashtag === feed.id.replace("#", "")
                    ? ""
                    : feed.id.replace("#", ""),
                )
              }
            />
          ))}
        </div>
      </div>

      <div className="w-full border-t border-black"></div>
    </section>
  );
};

export default PopularFeeds;
