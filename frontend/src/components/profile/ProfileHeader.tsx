export function ProfileHeader() {
  return (
    <div className="flex flex-col md:flex-row w-full items-center gap-6 md:gap-10 p-4 md:p-6 border border-neutral-300 rounded-md light">
      <div className="size-24 md:size-28 rounded-full bg-red-500 shrink-0 mx-auto md:mx-0" />
      <div className="flex flex-col gap-2.5 items-center md:items-start text-center md:text-left">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl">Web3Plug (murica/acc) 🇺🇸</h2>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <div className="rounded-lg bg-red-500 size-5 md:size-6" />
            <p className="text-sm md:text-base font-normal text-[#64748B]">
              6f2d.......xd345
            </p>
          </div>
        </div>
        <p className="text-[#262626] max-w-[610px] text-sm md:text-base">
          Daily updates on crypto and blockchain grants, funding opportunities
          and ecosystem development.
        </p>
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
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
