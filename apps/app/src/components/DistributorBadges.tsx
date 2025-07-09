import { Badge } from "./ui/badge";
import {
  getDistributorUrl,
  getDistributorDisplayName,
  type DistributorConfig,
} from "../lib/distributor-urls";

export function DistributorBadges({
  distribute,
}: {
  distribute: DistributorConfig[];
}) {
  return (
    <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
      {distribute.map((distributor, index) => {
        const displayName = getDistributorDisplayName(distributor);
        const url = getDistributorUrl(distributor);

        const badgeContent = (
          <Badge className="text-black border border-stone-500 rounded-md bg-stone-50 shadow-none px-2 py-0.5 text-xs whitespace-nowrap flex-shrink-0 cursor-pointer hover:bg-stone-100 transition-colors">
            {displayName}
          </Badge>
        );

        // If we have a URL, wrap in a link, otherwise just render the badge
        if (url) {
          return (
            <a
              key={`${distributor.plugin}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {badgeContent}
            </a>
          );
        }

        return (
          <Badge
            key={`${distributor.plugin}-${index}`}
            className="text-black border border-stone-500 rounded-md bg-stone-50 shadow-none px-2 py-0.5 text-xs whitespace-nowrap flex-shrink-0"
          >
            {displayName}
          </Badge>
        );
      })}
    </div>
  );
}
