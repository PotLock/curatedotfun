import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { FeedConfig } from "../types/config";

const FeedList = () => {
  // TODO: useQuery
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-start items-start gap-6 ">
        <h1 className=" text-[32px] leading-[63px] font-normal md:block hidden">
          Feeds
        </h1>
      </div>
      <nav className="flex flex-col gap-3 ">
        {feeds.length === 0 ? (
          <div className="flex justify-center items-center">
            <p className="text-gray-500">No feeds found</p>
          </div>
        ) : (
          feeds.map((feed) => (
            <Link
              key={feed.id}
              to="/feed/$feedId"
              params={{ feedId: feed.id }}
              className="flex flex-col gap-3 w-full "
            >
              <div className="flex items-center border border-1 border-neutral-200 rounded-md justify-center gap-3 py-2 px-3">
                <img
                  src="/images/feed-image.png"
                  alt="Feed Image"
                  className="w-[50px] h-[50px] aspect-square object-cover"
                  width={40}
                  height={40}
                />
                <div className="flex flex-col w-full">
                  <span className="text-[16px] ">{feed.name}</span>

                  <span className="">#{feed.id}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </nav>
    </div>
  );
};

export default FeedList;
