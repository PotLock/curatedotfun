import React from "react";
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
