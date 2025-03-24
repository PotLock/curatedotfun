import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLeaderboard, LeaderboardEntry, useAppConfig } from "../lib/api";

export default function Leaderboard() {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [showFeedDropdown, setShowFeedDropdown] = useState<boolean>(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState<boolean>(false);
  const [selectedFeed, setSelectedFeed] = useState<string>("All Feeds");
  const [selectedTime, setSelectedTime] = useState<string>("All Time");

  // Map UI time options to API timeRange values
  const getTimeRangeParam = (timeOption: string): string | undefined => {
    switch (timeOption) {
      case "All Time":
        return undefined;
      case "This Month":
        return "month";
      case "This Week":
        return "week";
      case "Today":
        return "today";
      default:
        return undefined;
    }
  };

  const timeRangeParam = getTimeRangeParam(selectedTime);
  const {
    data: leaderboard,
    isLoading,
    error,
  } = useLeaderboard(timeRangeParam);
  const { data: config } = useAppConfig();
  const feedDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  const timeOptions = ["All Time", "This Month", "This Week", "Today"];
  const feeds = useMemo(() => {
    return ["All Feeds", ...(config?.feeds.map((feed) => feed.name) || [])];
  }, [config]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        feedDropdownRef.current &&
        !feedDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFeedDropdown(false);
      }
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTimeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // const removeSpecialChars = (str: string): string => {
  //   return str.replace(/[^a-zA-Z0-9]/g, " ");
  // };

  const filteredLeaderboard = leaderboard?.filter((item) => {
    const searchTerm = searchQuery?.toLowerCase();
    const feedFilter =
      selectedFeed === "All Feeds"
        ? true
        : item.feedSubmissions?.some((feed) => feed.feedId === selectedFeed);

    const matchesSearch =
      !searchTerm ||
      item.curatorUsername?.toLowerCase().includes(searchTerm) ||
      item.feedSubmissions?.some((feed) =>
        feed.feedId?.toLowerCase().includes(searchTerm),
      );

    return feedFilter && matchesSearch;
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#111111] mb-4">Leaderboard</h1>
        <p className="text-[#64748b] max-w-2xl mx-auto">
          Top Performing Curators ranked by submissions, engagement and
          activities.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] h-4 w-4" />
          <input
            type="text"
            placeholder="Search by curator or feed"
            value={searchQuery || ""}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 border border-neutral-300 rounded-md w-full md:w-[300px] focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:border-transparent"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-auto" ref={feedDropdownRef}>
            <button
              onClick={() => setShowFeedDropdown(!showFeedDropdown)}
              className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-[180px]"
              aria-expanded={showFeedDropdown}
              aria-haspopup="listbox"
              aria-controls="feed-dropdown"
            >
              <span className="text-[#111111] text-sm">{selectedFeed}</span>
              <ChevronDown className="h-4 w-4 text-[#64748b]" />
            </button>
            {showFeedDropdown && (
              <div
                id="feed-dropdown"
                role="listbox"
                className="absolute top-full left-0 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-20"
              >
                {feeds.map((feed, index) => (
                  <button
                    key={index}
                    role="option"
                    aria-selected={selectedFeed === feed}
                    onClick={() => {
                      setSelectedFeed(feed);
                      setShowFeedDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-neutral-100 text-sm ${
                      selectedFeed === feed ? "bg-neutral-100" : ""
                    }`}
                  >
                    {feed}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative w-full md:w-auto" ref={timeDropdownRef}>
            <button
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-[160px]"
              aria-expanded={showTimeDropdown}
              aria-haspopup="listbox"
              aria-controls="time-dropdown"
            >
              <span className="text-[#111111] text-sm">{selectedTime}</span>
              <ChevronDown className="h-4 w-4 text-[#64748b]" />
            </button>
            {showTimeDropdown && (
              <div
                id="time-dropdown"
                role="listbox"
                className="absolute top-full left-0 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-20"
              >
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    role="option"
                    aria-selected={selectedTime === time}
                    onClick={() => {
                      setSelectedTime(time);
                      setShowTimeDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-neutral-100 text-sm ${
                      selectedTime === time ? "bg-neutral-100" : ""
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#e5e5e5]">
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Rank
                </th>
                {/* <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Curator
                </th> */}
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Username
                </th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Approval Rate
                </th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Submissions
                </th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">
                  Top Feeds
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-left py-8">
                    <p>Loading leaderboard data...</p>
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td colSpan={5} className="text-left py-8 text-red-500">
                    <p>Error loading leaderboard: {(error as Error).message}</p>
                  </td>
                </tr>
              )}

              {leaderboard && leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-left py-8">
                    <p>No curator data available.</p>
                  </td>
                </tr>
              )}
              {filteredLeaderboard?.map((item: LeaderboardEntry, index) => (
                <tr
                  key={item.curatorId}
                  className="border-b border-[#e5e5e5] hover:bg-[#f9fafb]"
                >
                  <td className="py-4 px-2 align-top">
                    <div className="flex items-center w-[35px]">
                      {index + 1 === 1 && (
                        <img
                          src="/icons/star-gold.svg"
                          className="h-5 w-5 mr-1"
                          alt="Gold star - 1st place"
                        />
                      )}
                      {index + 1 === 2 && (
                        <img
                          src="/icons/star-silver.svg"
                          className="h-5 w-5 mr-1"
                          alt="Silver star - 2nd place"
                        />
                      )}
                      {index + 1 === 3 && (
                        <img
                          src="/icons/star-bronze.svg"
                          className="h-5 w-5 mr-1"
                          alt="Bronze star - 3rd place"
                        />
                      )}
                      <div className="flex w-full text-right justify-end">
                        <span className="text-[#111111] font-medium">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* <td className="py-4 px-2 align-top">
                    <div className="flex items-start">
                      <HexagonAvatar />
                      <span className="font-medium text-[#111111] capitalize">
                        {removeSpecialChars(item.curatorUsername)}
                      </span>
                    </div>
                  </td> */}
                  <td className="py-4 px-2 align-top">
                    <div className="flex items-start gap-2">
                      <div>
                        <a
                          href={`https://x.com/${item.curatorUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 hover:underline"
                        >
                          <span className="font-medium text-[#111111]">
                            @{item.curatorUsername}
                          </span>
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="flex items-start">
                      {item.submissionCount > 0
                        ? `${Math.round((item.approvalCount / item.submissionCount) * 100)}%`
                        : "0%"}
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="flex items-start text-[#111111] font-medium">
                      {item.submissionCount}
                    </div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="flex flex-col">
                      <div className="flex items-start gap-2">
                        {item.feedSubmissions &&
                          item.feedSubmissions.length > 0 && (
                            <div className="flex items-center justify-between gap-1 border border-neutral-400 px-2 py-1 rounded-md w-[150px]">
                              <span className="text-sm">
                                #{item.feedSubmissions[0].feedId}
                              </span>
                              <span className="text-sm">
                                {item.feedSubmissions[0].count}/
                                {item.feedSubmissions[0].totalInFeed}
                              </span>
                            </div>
                          )}

                        {item.feedSubmissions &&
                          item.feedSubmissions.length > 1 && (
                            <button
                              onClick={() => toggleRow(index)}
                              className="w-8 h-8 flex items-center justify-center border border-neutral-400 rounded-md transition-colors"
                            >
                              {expandedRows.includes(index) ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <span className="text-xs">
                                  +{item.feedSubmissions.length - 1}
                                </span>
                              )}
                            </button>
                          )}
                      </div>

                      {item.feedSubmissions && expandedRows.includes(index) && (
                        <div className="flex flex-col gap-2 mt-2 pl-0">
                          {item.feedSubmissions
                            .slice(1)
                            .map((feed, feedIndex) => (
                              <div
                                key={feedIndex}
                                className="flex items-center"
                              >
                                <div className="flex items-center gap-1 border border-neutral-400 px-2 py-1 rounded-md justify-between w-[150px]">
                                  <span className="text-sm">
                                    #{feed.feedId}
                                  </span>
                                  <span className="text-sm">
                                    {feed.count}/{feed.totalInFeed}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
