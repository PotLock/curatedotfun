import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LeaderboardEntry } from "../lib/api";
import { Container } from "./Container";
import { Hero } from "./Hero";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { LeaderboardFilters } from "./leaderboard/LeaderboardFilters";
import { LeaderboardTable } from "./leaderboard/LeaderboardTable";

interface LeaderboardSearch {
  feed: string;
  timeframe: string;
}

export default React.memo(function Leaderboard({
  search,
  leaderboard,
  isLoading,
  error,
}: {
  search: LeaderboardSearch;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
}) {
  const {
    searchQuery,
    showFeedDropdown,
    showTimeDropdown,
    feeds,
    timeOptions,
    handleSearch,
    handleFeedDropdownToggle,
    handleTimeDropdownToggle,
    handleFeedDropdownClose,
    handleTimeDropdownClose,
    expandAllRows,
    collapseAllRows,
    feedDropdownRef,
    timeDropdownRef,
    table,
    hasData,
  } = useLeaderboard(leaderboard, search);

  return (
    <div className="flex flex-col mx-auto">
      <Hero
        title="Leaderboard"
        description="Top performing curators ranked by submissions, engagement, and activities."
      />

      <Container>
        <LeaderboardFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          feeds={feeds}
          timeOptions={timeOptions}
          search={search}
          showFeedDropdown={showFeedDropdown}
          showTimeDropdown={showTimeDropdown}
          onFeedDropdownToggle={handleFeedDropdownToggle}
          onTimeDropdownToggle={handleTimeDropdownToggle}
          onFeedDropdownClose={handleFeedDropdownClose}
          onTimeDropdownClose={handleTimeDropdownClose}
          feedDropdownRef={feedDropdownRef}
          timeDropdownRef={timeDropdownRef}
        />

        {hasData && (
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={expandAllRows}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-neutral-300 rounded-md bg-white hover:bg-neutral-50 transition-colors text-[#111111]"
            >
              <ChevronDown className="h-4 w-4" />
              Expand All
            </button>
            <button
              onClick={collapseAllRows}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-neutral-300 rounded-md bg-white hover:bg-neutral-50 transition-colors text-[#111111]"
            >
              <ChevronUp className="h-4 w-4" />
              Collapse All
            </button>
          </div>
        )}

        <LeaderboardTable
          table={table}
          isLoading={isLoading}
          error={error}
          hasData={hasData}
        />
      </Container>
    </div>
  );
});
