export function ProfileHeader() {
  return (
    <div className="flex w-full items-center gap-10 p-6 border border-neutral-300 rounded-md light">
      <div className="size-28 rounded-full bg-red-500 shrink-0" />
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col">
          <h2>Web3Plug (murica/acc) 🇺🇸</h2>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-500 size-6" />
            <p className="text-base font-normal text-muted-foreground">
              6f2d.......xd345
            </p>
          </div>
        </div>
        <p className="text-[#262626] max-w-[610px]">
          Daily updates on crypto and blockchain grants, funding opportunities
          and ecosystem development.
        </p>
        <div className="flex items-center gap-2.5">
          <a
            href="#"
            target="_blank"
            className="h-[26px] font-[Geist] border rounded-md py-0.5 px-2.5 bg-[#F5F5F5] border-[#262626] text-black text-xs font-medium flex items-center justify-center gap-2 hover:bg-black/10 transition-all duration-300 ease-in-out"
          >
            @plungrel
          </a>
          <a
            href="#"
            target="_blank"
            className="h-[26px] font-[Geist] border rounded-md py-0.5 px-2.5 bg-[#F5F5F5] border-[#262626] text-black text-xs font-medium flex items-center justify-center gap-2 hover:bg-black/10 transition-all duration-300 ease-in-out"
          >
            /web3.plungrel
          </a>
        </div>
      </div>
    </div>
  );
}
