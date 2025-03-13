import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FaChevronRight } from "react-icons/fa";
import type { FeedConfig } from "../types/config";

const FeedList = ({ selectedFeedId }: { selectedFeedId?: string }) => {
  const { data: feeds = [] } = useQuery<FeedConfig[]>({
    queryKey: ["feeds"],
    queryFn: async () => {
      const response = await fetch("/api/feeds");
      if (!response.ok) {
        throw new Error("Failed to fetch feeds");
      }
      return response.json();
    },
  });

  return (
    <div className="flex flex-col md:block">
      <div className="flex justify-between items-center md:my-2 lg:my-4">
        <h1 className="text-2xl font-bold md:px-2">Feeds</h1>
        {feeds.length > 0 && (
          <span className="md:hidden text-gray-400 flex items-center">
            <span className="mr-1">scroll</span>
            <FaChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <nav className="flex md:block overflow-x-auto p-1">
        {feeds.length === 0 ? (
          <div className="flex justify-center items-center md:p-8">
            <p className="text-gray-500">No feeds found</p>
          </div>
        ) : (
          feeds.map((feed) => (
            <Link
              key={feed.id}
              to="/feed/$feedId"
              params={{ feedId: feed.id }}
              className={`flex-shrink-0 min-w-[200px] mx-2 md:mx-0 md:min-w-0 block px-4 py-2 text-sm border-2 border-black shadow-sharp transition-all duration-200 md:mb-2 ${
                selectedFeedId === feed.id
                  ? "bg-gray-100 text-black font-medium translate-x-0.5 translate-y-0.5 shadow-none"
                  : "text-gray-600 hover:shadow-sharp-hover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">{feed.name}</span>
                <span className="">#{feed.id}</span>
              </div>
            </Link>
          ))
        )}
      </nav>
    </div>
  );
};

export default FeedList;
