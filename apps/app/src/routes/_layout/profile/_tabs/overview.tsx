import { ApproverFor } from "@/components/profile/overview/ApproverFor";
import { createFileRoute } from "@tanstack/react-router";
// import { CurateCTA } from "./CurateCTA";
import { CuratorFor } from "@/components/profile/overview/CuratorFor";
// import { TopBadges } from "./TopBadges";
// import { UserStats } from "./UserStats";

export const Route = createFileRoute("/_layout/profile/_tabs/overview")({
  component: ProfileOverview,
});

function ProfileOverview() {
  return (
    <div className="flex flex-col items-stretch gap-4 sm:gap-6">
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <UserStats />
        <TopBadges />
      </div> */}
      {/* <CurateCTA /> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <ApproverFor />
        <CuratorFor />
      </div>
    </div>
  );
}
