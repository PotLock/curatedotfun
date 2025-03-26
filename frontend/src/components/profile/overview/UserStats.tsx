interface StatCardProps {
  title: string;
  value: string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="border-r px-3 py-4 border-[#64748B] gap-1.5 flex flex-col last:border-r-0">
      <p className="text-base font-semibold text-[#020617] font-[Geist]">
        {value}
      </p>
      <h4 className="text-[#64748B] text-sm leading-5 font-normal font-[Geist]">
        {title}
      </h4>
    </div>
  );
}

export function UserStats() {
  return (
    <div className="border rounded-lg py-5 px-[14px] border-neutral-300 gap-6 flex flex-col">
      <div className="rounded border pt-24 px-5 pb-[14px] border-[#94A3B8] relative overflow-hidden">
        <p className="font-semibold text-black text-[22px] leading-6 z-10 relative">
          Welcome,
          <br />
          72d2......2532
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
      <div className="grid grid-cols-3 gap-5">
        <StatCard value="7,000" title="Total Approves" />
        <StatCard value="5,000" title="Total Submissions" />
        <StatCard value="38%" title="Approval Rate" />
      </div>
    </div>
  );
}
