import { createFileRoute } from "@tanstack/react-router";
import LeaderBoard from "../components/LeaderBoard";
import LayoutCustom from "../components/LayoutCustom";
import { z } from 'zod'
import { useSearch } from "@tanstack/react-router";
import { useLeaderboard } from "../lib/api";

const leaderboardSearchSchema = z.object({
  feed: z.string().catch('all feeds'),
  timeframe: z.string().catch('all'),
})

export const Route = createFileRoute("/leaderboard")({
  component: LeaderBoardPage,
  validateSearch: (search) => leaderboardSearchSchema.parse(search)
});

function LeaderBoardPage() {
  
  const search = useSearch({
    from: "/leaderboard",
  })

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

  const {
    data,
    isLoading,
    error,
  } = useLeaderboard(timeRangeParam);

  return (
    <LayoutCustom>
      <LeaderBoard search={search} leaderboard={data || []} isLoading={isLoading} error={error} />
    </LayoutCustom>
  );
}
