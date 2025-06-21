import { Link } from "@tanstack/react-router";
import { ChevronDown, Search } from "lucide-react";

interface Feed {
  label: string;
  value: string;
}

interface TimeOption {
  label: string;
  value: string;
}

interface LeaderboardFiltersProps {
  searchQuery: string | null;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  feeds: Feed[];
  timeOptions: TimeOption[];
  search: {
    feed: string;
    timeframe: string;
  };
  showFeedDropdown: boolean;
  showTimeDropdown: boolean;
  onFeedDropdownToggle: () => void;
  onTimeDropdownToggle: () => void;
  onFeedDropdownClose: () => void;
  onTimeDropdownClose: () => void;
  feedDropdownRef: React.RefObject<HTMLDivElement>;
  timeDropdownRef: React.RefObject<HTMLDivElement>;
}

export function LeaderboardFilters({
  searchQuery,
  onSearchChange,
  feeds,
  timeOptions,
  search,
  showFeedDropdown,
  showTimeDropdown,
  onFeedDropdownToggle,
  onTimeDropdownToggle,
  onFeedDropdownClose,
  onTimeDropdownClose,
  feedDropdownRef,
  timeDropdownRef,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row max-w-[400px] md:max-w-screen-xl md:w-full mx-auto justify-between items-center mb-6 gap-4 px-4 py-8">
      <div className="relative w-full md:w-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] h-4 w-4" />
        <input
          type="text"
          placeholder="Search by curator or feed"
          value={searchQuery || ""}
          onChange={onSearchChange}
          className="pl-10 pr-4 py-2 border border-neutral-300 rounded-md w-full md:w-[300px] focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:border-transparent"
        />
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <div className="relative w-full md:w-auto" ref={feedDropdownRef}>
          <button
            onClick={onFeedDropdownToggle}
            className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-[180px]"
            aria-expanded={showFeedDropdown}
            aria-haspopup="listbox"
            aria-controls="feed-dropdown"
          >
            <span className="text-[#111111] text-sm">
              {feeds.find((feed) => feed.value === search.feed)?.label}
            </span>
            <ChevronDown className="h-4 w-4 text-[#64748b]" />
          </button>
          {showFeedDropdown && (
            <div
              id="feed-dropdown"
              role="listbox"
              className="absolute top-full flex flex-col left-0 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-20"
            >
              {feeds.map((feed, index) => (
                <Link
                  key={index}
                  to="/leaderboard"
                  search={{ feed: feed.value, timeframe: search.timeframe }}
                  role="option"
                  aria-selected={search.feed === feed.value}
                  onClick={onFeedDropdownClose}
                  className={`w-full px-4 py-2 text-left hover:bg-neutral-100 text-sm ${
                    search.feed === feed.value ? "bg-neutral-100" : ""
                  }`}
                >
                  {feed.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="relative w-full md:w-auto" ref={timeDropdownRef}>
          <button
            onClick={onTimeDropdownToggle}
            className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-[160px]"
            aria-expanded={showTimeDropdown}
            aria-haspopup="listbox"
            aria-controls="time-dropdown"
          >
            <span className="text-[#111111] text-sm">
              {
                timeOptions.find((option) => option.value === search.timeframe)
                  ?.label
              }
            </span>
            <ChevronDown className="h-4 w-4 text-[#64748b]" />
          </button>
          {showTimeDropdown && (
            <div
              id="time-dropdown"
              role="listbox"
              className="absolute top-full flex flex-col left-0 mt-1 w-full bg-white border border-neutral-200 rounded-md shadow-lg z-20"
            >
              {timeOptions.map((time) => (
                <Link
                  key={time.value}
                  to="/leaderboard"
                  search={{
                    feed: search.feed.toLowerCase(),
                    timeframe: time.value,
                  }}
                  role="option"
                  aria-selected={search.timeframe === time.label}
                  onClick={onTimeDropdownClose}
                  className={`w-full px-4 py-2 text-left hover:bg-neutral-100 text-sm ${
                    search.timeframe === time.label ? "bg-neutral-100" : ""
                  }`}
                >
                  {time.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
