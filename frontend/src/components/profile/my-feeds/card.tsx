import { Info, Newspaper, Users } from "lucide-react";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";

interface CardProps {
  image: string;
  title: string;
  tags: string[];
  description: string;
  createdAt: Date;
  curators: number;
  contents: number;
  isCompleted: boolean;
}

export function Card({
  image,
  title,
  tags,
  description,
  createdAt,
  curators,
  contents,
  isCompleted,
}: CardProps) {
  return (
    <div className="self-stretch flex flex-col">
      {!isCompleted && (
        <div className="flex items-center text-yellow-700 gap-4 px-4 py-2 rounded-t-lg border border-yellow-700 bg-yellow-50">
          <Info strokeWidth={1.5} size={24} />
          Setup incomplete
        </div>
      )}
      <div
        className={cn(
          "flex p-4 gap-[32px] flex-col justify-between flex-1 self-stretch rounded-lg border border-neutral-200 bg-white",
          !isCompleted && "border-yellow-700 rounded-t-none border-t-0",
        )}
      >
        <div className="space-y-3">
          <div className="flex gap-[14px] p-2.5 rounded-md bg-neutral-50">
            <img
              src={image}
              alt="Near Week"
              className="object-cover size-[68px] shrink-0"
            />
            <div>
              <p className="font-londrina font-[900] text-black text-[24px]">
                {title}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {tags.length > 0 &&
                  tags.map((tag, index) => (
                    <Badge key={index} className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
          <p>{description}</p>
          <p className="mt-0.5">Created {createdAt.toLocaleDateString()}</p>
        </div>
        <div className="flex gap-[14px] items-center justify-between p-2.5 rounded-md bg-neutral-50">
          <div className="flex items-center gap-2">
            <Users strokeWidth={1.5} size={24} />
            <p className="text-black text-base">
              <span className="font-bold">{curators}</span> Curators
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Newspaper strokeWidth={1.5} size={24} />
            <p className="text-black text-base">
              <span className="font-bold">{contents}</span> Contents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
