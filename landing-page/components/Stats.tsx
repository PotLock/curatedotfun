import { useQuery } from "@tanstack/react-query";

// Define the stats data structure to match the backend API
interface StatsData {
  postsCount: number;
  feedsCount: number;
  curatorsCount: number;
  distributionsCount: number;
}

/**
 * Fetches stats from the API
 */
const fetchStats = async (): Promise<StatsData> => {
  // Determine the API URL based on environment
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://curatedotfun-floral-sun-1539.fly.dev"
      : "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }

  return await response.json();
};

const Stats = () => {
  // Use React Query to fetch and cache the stats
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // If data is loading or there's an error, show loading state
  if (isLoading || isError || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4">
        <div className="p-6 md:p-8 border-r border-b md:border-b-0 border-black">
          <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
            ...
          </h4>
          <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
            POSTS CURATED
          </p>
        </div>
        <div className="p-6 md:p-8 border-b md:border-r md:border-b-0 border-black">
          <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
            ...
          </h4>
          <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
            MEDIA PARTNERS
          </p>
        </div>
        <div className="p-6 md:p-8 border-r border-black">
          <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
            ...
          </h4>
          <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
            CURATORS
          </p>
        </div>
        <div className="p-6 md:p-8">
          <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
            ...
          </h4>
          <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
            FEEDS
          </p>
        </div>
      </div>
    );
  }

  // Render actual stats when data is available
  return (
    <div className="grid grid-cols-2 md:grid-cols-4">
      <div className="p-6 md:p-8 border-r border-b md:border-b-0 border-black">
        <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
          {stats.postsCount.toLocaleString()}
        </h4>
        <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
          POSTS CURATED
        </p>
      </div>
      <div className="p-6 md:p-8 border-b md:border-r md:border-b-0 border-black">
        <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
          {stats.distributionsCount.toLocaleString()}
        </h4>
        <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
          MEDIA PARTNERS
        </p>
      </div>
      <div className="p-6 md:p-8 border-r border-black">
        <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
          {`+${stats.curatorsCount.toLocaleString()}`}
        </h4>
        <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
          CURATORS
        </p>
      </div>
      <div className="p-6 md:p-8">
        <h4 className="text-3xl md:text-4xl font-bold mb-2 text-center md:text-left">
          {stats.feedsCount.toLocaleString()}
        </h4>
        <p className="text-gray-500 uppercase text-xs md:text-sm text-center md:text-left">
          FEEDS
        </p>
      </div>
    </div>
  );
};

export default Stats;
