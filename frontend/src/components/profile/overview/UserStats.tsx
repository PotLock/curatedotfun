import { useWeb3Auth } from "../../../hooks/use-web3-auth";
import { useMyActivity } from "../../../lib/api";

interface StatCardProps {
  title: string;
  value: string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="border-r px-2 sm:px-3 py-2 sm:py-4 border-[#64748B] gap-1 flex flex-col last:border-r-0">
      <p className="text-sm sm:text-base font-semibold text-[#020617] font-[Geist]">
        {value}
      </p>
      <h4 className="text-[#64748B] text-xs leading-5 font-normal font-[Geist]">
        {title}
      </h4>
    </div>
  );
}

export function UserStats() {
  const { currentUserProfile } = useWeb3Auth();
  const { data: userActivityStats, isLoading } = useMyActivity();

  console.log(userActivityStats);

  return (
    <div className="border rounded-lg py-3 sm:py-5 px-2 sm:px-[14px] border-neutral-300 gap-4 sm:gap-6 flex flex-col">
      <div className="rounded border pt-16 sm:pt-24 px-3 sm:px-5 pb-2 sm:pb-[14px] border-[#94A3B8] relative overflow-hidden">
        <p className="font-semibold text-black text-lg sm:text-[22px] leading-6 z-10 relative">
          Welcome,
          <br />
          {currentUserProfile?.near_account_id}
        </p>
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <div className="absolute inset-0 bg-gradient-to-l from-white/60 to-white/70 z-10"></div>
          <img
            src="/images/overview-bg.png"
            alt="Profile Background"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        <StatCard
          value={
            isLoading
              ? "-"
              : userActivityStats?.totalApprovals?.toString() || "0"
          }
          title="Total Approves"
        />
        <StatCard
          value={
            isLoading
              ? "-"
              : userActivityStats?.totalSubmissions?.toString() || "0"
          }
          title="Total Submissions"
        />
        <StatCard
          value={
            isLoading
              ? "-"
              : userActivityStats?.approvalRate?.toString() + "%" || "0%"
          }
          title="Approval Rate"
        />
      </div>
    </div>
  );
}
