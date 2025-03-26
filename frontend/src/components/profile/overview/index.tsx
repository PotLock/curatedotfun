import { TopBadges } from "./TopBadges";
import { UserStats } from "./UserStats";

export function ProfileOverview() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <UserStats />
      <TopBadges />
    </div>
  );
}
