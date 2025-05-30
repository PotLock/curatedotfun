import { useLeaderboard } from "../lib/api";
import { UserLink } from "./FeedItem";
import { Badge } from "./ui/badge";

interface TopCuratorsProps {
  feedId?: string;
  limit?: number;
}

const TopCurators = ({ feedId, limit = 10 }: TopCuratorsProps) => {
  const { data: leaderboard, isLoading, error } = useLeaderboard();

  // Filter leaderboard by feedId if provided
  const filteredLeaderboard =
    feedId && feedId !== "all"
      ? leaderboard?.filter((item) =>
          item.feedSubmissions?.some((feed) => feed.feedId === feedId),
        )
      : leaderboard;

  // Sort and limit the number of entries
  const topCurators = filteredLeaderboard?.slice(0, limit).sort((a, b) => {
    // If feedId is provided, sort by the specific feed submission count
    if (feedId && feedId !== "all") {
      const aFeed = a.feedSubmissions?.find((feed) => feed.feedId === feedId);
      const bFeed = b.feedSubmissions?.find((feed) => feed.feedId === feedId);
      const aCount = aFeed?.count || 0;
      const bCount = bFeed?.count || 0;
      return bCount - aCount;
    }
    // Otherwise sort by total submissions
    return b.submissionCount - a.submissionCount;
  });

  if (isLoading) {
    return (
      <div className="py-4">
        <p className="text-gray-500 text-sm">Loading curator data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <p className="text-red-500 text-sm">Failed to load curators</p>
      </div>
    );
  }

  if (!topCurators || topCurators.length === 0) {
    return (
      <div className="py-4">
        <p className="text-gray-500 text-sm">No curators found</p>
      </div>
    );
  }

  return (
    <div className="w-full border-collapse flex flex-col gap-3">
      {topCurators.map((curator, index) => {
        // Find the specific feed submission if feedId is provided
        const feedSubmission =
          feedId && feedId !== "all"
            ? curator.feedSubmissions?.find((feed) => feed.feedId === feedId)
            : null;

        return (
          <div key={curator.curatorId} className="flex flex-col gap-3">
            <div className="px-3 py-2 flex w-full gap-2 items-center rounded-md border-1 border border-neutral-100">
              {/* <div>
                <img
                  src="/images/web3-plug.png"
                  alt="Web3Plug"
                  className="h-8 w-8 rounded-md"
                />
              </div> */}
              <div className="flex justify-between w-full items-center">
                <div className="flex align-items">
                  {/* <p className="text-xs font-black">
                    {curator?.name ? curator.name : "Web3Plug (murica/acc)"}
                  </p> */}
                  <UserLink username={curator.curatorUsername} />
                  <div className="flex gap-2">
                    {/* <a href={`https://twitter.com/${curator.curatorUsername}`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="10"
                        viewBox="0 0 11 10"
                        fill="none"
                      >
                        <path
                          d="M4.21265 1.36328L6.00366 3.72949L6.09253 3.8457L6.18823 3.73535L8.2478 1.36328H9.20581L6.59546 4.36719L6.53198 4.43945L6.59058 4.5166L9.73022 8.66699H7.44702L5.47241 6.08203L5.38452 5.9668L5.28882 6.07617L3.0105 8.66699H2.05151L4.86401 5.44531L4.92749 5.37207L4.8689 5.29492L1.86499 1.36328H4.21265ZM3.02124 2.03711L7.64624 8.08691L7.68237 8.13379H8.68335L8.53979 7.94336L3.9812 1.89355L3.94507 1.8457H2.87476L3.02124 2.03711Z"
                          fill="#020617"
                          stroke="#0F172A"
                          stroke-width="0.23767"
                        />
                      </svg>
                    </a> */}
                    {/* <a
                      href={`https://linkedin.com/in/${curator.curatorUsername}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="10"
                        viewBox="0 0 11 10"
                        fill="none"
                      >
                        <g clipPath="url(#clip0_1032_8263)">
                          <path
                            d="M7.4659 3.32994C8.12994 3.32994 8.76678 3.59373 9.23633 4.06327C9.70587 4.53282 9.96966 5.16966 9.96966 5.8337V8.75476H8.30049V5.8337C8.30049 5.61235 8.21256 5.40007 8.05604 5.24356C7.89952 5.08704 7.68724 4.99911 7.4659 4.99911C7.24455 4.99911 7.03227 5.08704 6.87575 5.24356C6.71924 5.40007 6.63131 5.61235 6.63131 5.8337V8.75476H4.96213V5.8337C4.96213 5.16966 5.22592 4.53282 5.69547 4.06327C6.16501 3.59373 6.80186 3.32994 7.4659 3.32994Z"
                            stroke="#0F172A"
                            stroke-width="0.678103"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M3.29296 3.74723H1.62378V8.75476H3.29296V3.74723Z"
                            stroke="#0F172A"
                            stroke-width="0.678103"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M2.45837 2.49535C2.9193 2.49535 3.29296 2.12169 3.29296 1.66076C3.29296 1.19983 2.9193 0.826172 2.45837 0.826172C1.99744 0.826172 1.62378 1.19983 1.62378 1.66076C1.62378 2.12169 1.99744 2.49535 2.45837 2.49535Z"
                            stroke="#0F172A"
                            stroke-width="0.678103"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_1032_8263">
                            <rect
                              width="10.0151"
                              height="10.0151"
                              fill="white"
                              transform="translate(0.789307 -0.0078125)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                    </a> */}
                  </div>
                </div>
                <div>
                  <Badge
                    className={`py-0.5 shadow-none rounded-sm min-w-12 w-full ${index + 1 === 1 ? "bg-[#B78722] text-white" : index + 1 === 2 ? "bg-[#94A3B8] text-white" : index + 1 === 3 ? "bg-[#854D0E] text-white" : "bg-[#F5F5F5] text-neutral-500"}`}
                  >
                    <span className="text-sm font-medium w-full">
                      {feedId && feedId !== "all" && feedSubmission
                        ? `${feedSubmission.count}`
                        : curator.submissionCount}{" "}
                      Pts
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopCurators;
