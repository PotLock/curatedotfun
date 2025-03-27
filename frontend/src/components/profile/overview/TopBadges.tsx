import { BadgeCent } from "lucide-react";

interface BadgeProps {
  image: string;
  points: number;
  name: string;
  description: string;
}
function Badge({ image, points, name, description }: BadgeProps) {
  return (
    <div className="rounded-md border py-2 px-3 bg-white border-neutral-100 flex items-start sm:items-center justify-between gap-2 sm:gap-0">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <img src={image} alt="Badge" className="size-8 object-cover shrink-0" />
        <div>
          <h5 className="text-[#020617] text-sm font-semibold">{name}</h5>
          <p className="text-[#64748B] text-xs">{description}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold shrink-0">
        {points} Points <BadgeCent color="#16A34A" />
      </p>
    </div>
  );
}
export function TopBadges() {
  return (
    <div className="border rounded-lg px-2 sm:px-3 pb-3 border-neutral-300 gap-4 sm:gap-6 flex flex-col">
      <h3 className="text-neutral-500 font-sans text-sm sm:text-base font-bold py-2 sm:py-[14px] border-b border-dashed border-neutral-500 truncate">
        Top Badges
      </h3>
      <div className="grid gap-1">
        <Badge
          image="/icons/novice-badge.png"
          points={100}
          name="Curator Novice"
          description="Successfully curate 50 Content. "
        />
        <Badge
          image="/icons/novice-badge.png"
          points={100}
          name="Curator Novice"
          description="Successfully curate 50 Content. "
        />
        <Badge
          image="/icons/novice-badge.png"
          points={100}
          name="Curator Novice"
          description="Successfully curate 50 Content. "
        />
        <Badge
          image="/icons/novice-badge.png"
          points={100}
          name="Curator Novice"
          description="Successfully curate 50 Content. "
        />
      </div>
    </div>
  );
}
