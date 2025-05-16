import { useMyCuratedFeeds } from "../../../lib/api";
import { Badge } from "../../ui/badge";

interface ItemProps {
  image: string;
  points: string;
  name: string;
  tags: string[];
}

function Item({ image, points, name, tags }: ItemProps) {
  return (
    <div className="flex py-2 px-2 sm:px-3 rounded-md border items-start sm:items-center justify-between border-neutral-100 gap-2 sm:gap-0">
      <div className="flex items-center gap-2 sm:gap-5 w-full">
        <img
          src={image}
          className="object-cover w-10 h-10 sm:size-[52px] shrink-0"
        />
        <div className="flex flex-col">
          <h5 className="text-sm sm:text-base">{name}</h5>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {tags.length > 0 &&
              tags.map((tag, index) => (
                <Badge key={index} className="text-xs">
                  #{tag}
                </Badge>
              ))}
          </div>
        </div>
      </div>
      <h5 className="text-lg sm:text-xl font-[900] text-black shrink-0">
        {points}
      </h5>
    </div>
  );
}

export function CuratorFor() {
  const { data: userCuratedFeeds, isLoading } = useMyCuratedFeeds();

  return (
    <div className="border rounded-lg px-2 sm:px-3 pb-3 border-neutral-300 gap-2 sm:gap-3 flex flex-col">
      <div className="flex items-center text-base sm:text-xl justify-between w-full py-2 sm:py-[14px] border-b border-dashed border-neutral-500">
        <p className="text-neutral-500 font-sans w-full font-bold truncate">
          Curator For
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
        {!isLoading && userCuratedFeeds?.length === 0 && (
          <div className="flex items-center justify-center h-24">
            <span className="text-neutral-500">No feeds found</span>
          </div>
        )}
        {!isLoading &&
          Array.isArray(userCuratedFeeds) &&
          userCuratedFeeds.map((feed) => (
            <Item
              name={feed.feed_name || "Unknown Feed"}
              tags={["near"]}
              key={feed.feed_id}
              image="/images/near-week.png"
              points={feed.points.toString()}
            />
          ))}
      </div>
    </div>
  );
}
