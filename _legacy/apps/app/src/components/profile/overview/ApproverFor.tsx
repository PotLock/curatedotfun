import { FeedInfo } from "@curatedotfun/types";
import { useMyApprovedFeeds } from "../../../lib/api";

function Item({ data }: { data: FeedInfo }) {
  return (
    <div className="flex py-2 px-2 sm:px-3 rounded-md border items-start sm:items-center justify-between border-neutral-100 gap-2 sm:gap-0">
      <div className="flex items-center gap-2 sm:gap-5 w-full">
        <img
          src={data.image || "/images/near-week.png"} // TODO: need better default
          className="object-cover w-10 h-10 sm:size-[52px] shrink-0"
        />
        <div className="flex flex-col">
          <h5 className="text-sm sm:text-base">{data.name}</h5>
        </div>
      </div>
      {/* <h5 className="text-lg sm:text-xl font-[900] text-black shrink-0">
        {(feed as any).points}
      </h5> */}
    </div>
  );
}

export function ApproverFor() {
  const { data: userApprovedFeeds, isLoading, isError } = useMyApprovedFeeds();

  return (
    <div className="border rounded-lg px-2 sm:px-3 pb-3 border-neutral-300 gap-2 sm:gap-3 flex flex-col">
      <div className="flex items-center text-base sm:text-xl justify-between w-full py-2 sm:py-[14px] border-b border-dashed border-neutral-500">
        <p className="text-neutral-500 font-sans w-full font-bold truncate">
          Approver For
        </p>
        <p className="text-neutral-500 font-sans font-bold whitespace-nowrap">
          #No
        </p>
      </div>
      <div className="grid gap-1">
        {isLoading && (
          <div className="flex items-center justify-center h-24">
            <span className="text-neutral-500">Loading...</span>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-24">
            <span className="text-red-500">Error fetching feeds</span>
          </div>
        )}
        {!isLoading && !isError && userApprovedFeeds?.length === 0 && (
          <div className="flex items-center justify-center h-24">
            <span className="text-neutral-500">No feeds found</span>
          </div>
        )}
        {!isLoading &&
          !isError &&
          Array.isArray(userApprovedFeeds) &&
          userApprovedFeeds.map((feed) => <Item key={feed.id} data={feed} />)}
      </div>
    </div>
  );
}
