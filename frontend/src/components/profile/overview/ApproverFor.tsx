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

export function ApproverFor() {
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
        <Item
          image="/images/near-week.png"
          points={"1,000"}
          name="Near Week"
          tags={["near"]}
        />
        <Item
          image="/images/near-week.png"
          points={"1,000"}
          name="Near Week"
          tags={["near"]}
        />
        <Item
          image="/images/near-week.png"
          points={"1,000"}
          name="Near Week"
          tags={["near"]}
        />
      </div>
    </div>
  );
}
