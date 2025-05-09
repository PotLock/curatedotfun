import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import LeaderBoard from "../../components/LeaderBoard";
import { useLeaderboard } from "../../lib/api";

const leaderboardSearchSchema = z.object({
  feed: z.string().catch("all feeds"),
  timeframe: z.string().catch("all"),
});

export const Route = createFileRoute("/_layout/leaderboard")({
  component: LeaderBoardPage,
  validateSearch: (search) => leaderboardSearchSchema.parse(search),
});

function LeaderBoardPage() {
  const search = useSearch({
    from: "/_layout/leaderboard",
  });

  const getTimeRangeParam = (timeOption: string): string | undefined => {
    switch (timeOption) {
      case "all":
        return undefined;
      case "month":
        return "month";
      case "week":
        return "week";
      case "today":
        return "today";
      default:
        return undefined;
    }
  };

  const timeRangeParam = getTimeRangeParam(search.timeframe);

  const { data, isLoading, error } = useLeaderboard(timeRangeParam);

  return (
    <LeaderBoard
      search={search}
      leaderboard={data || []}
      isLoading={isLoading}
      error={error}
    />
  );
}
