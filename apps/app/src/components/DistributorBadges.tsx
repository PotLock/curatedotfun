import { Badge } from "./ui/badge";

export function DistributorBadges({
  distribute,
}: {
  distribute: { plugin: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
      {distribute.map((distributor, index) => {
        const pluginName = distributor.plugin.replace("@curatedotfun/", "");
        return (
          <Badge
            key={`${distributor.plugin}-${index}`}
            className="text-black border border-stone-500 rounded-md bg-stone-50 shadow-none capitalize px-2 py-0.5 text-xs whitespace-nowrap flex-shrink-0"
          >
            {pluginName}
          </Badge>
        );
      })}
    </div>
  );
}
