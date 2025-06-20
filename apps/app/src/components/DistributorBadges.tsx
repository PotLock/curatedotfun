import { Badge } from "./ui/badge";

export function DistributorBadges({
  distribute,
}: {
  distribute: { plugin: string }[];
}) {
  return (
    <>
      <p className="flex">Posting to:</p>
      {distribute.map((distributor) => {
        const pluginName = distributor.plugin.replace("@curatedotfun/", "");
        return (
          <Badge
            key={distributor.plugin}
            className="text-black border border-stone-500 rounded-md bg-stone-50 shadow-none capitalize px-2 py-0.5"
          >
            {pluginName}
          </Badge>
        );
      })}
    </>
  );
}
