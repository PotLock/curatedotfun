import { createFileRoute } from "@tanstack/react-router";
import LeaderBoard from "../components/LeaderBoard";
import LayoutCustom from "../components/LayoutCustom";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderBoardPage,
});

function LeaderBoardPage() {
  return (
    <LayoutCustom>
      <LeaderBoard />
    </LayoutCustom>
  );
}
