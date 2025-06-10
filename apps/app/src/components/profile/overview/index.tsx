import { ApproverFor } from "./ApproverFor";
import { CurateCTA } from "./CurateCTA";
import { CuratorFor } from "./CuratorFor";
import { TopBadges } from "./TopBadges";
import { UserStats } from "./UserStats";

export function ProfileOverview() {
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
