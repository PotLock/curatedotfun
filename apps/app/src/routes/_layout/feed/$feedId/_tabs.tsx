import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
} from "@tanstack/react-router";
import { ListFilter, type LucideIcon } from "lucide-react";

interface TabDefinition {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDefinition[] = [
  {
    to: "/feed/$feedId/curation",
    label: "Curation",
    icon: ListFilter,
  },
  // {
  //   to: "/feed/$feedId/proposals",
  //   label: "Proposals",
  //   icon: Vote,
  // },
  // {
  //   to: "/feed/$feedId/_tabs/token",
  //   label: "Token",
  //   icon: Coins,
  // },
  // {
  //   to: "/feed/$feedId/_tabs/points",
  //   label: "Points",
  //   icon: Award,
  // },
  // {
  //   to: "/feed/$feedId/_tabs/members",
  //   label: "Members",
  //   icon: UsersRound,
  // },
  // {
  //   to: "/feed/$feedId/settings",
  //   label: "Settings",
  //   icon: Settings2,
  // },
];

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs")({
  component: FeedTabsAreaLayout,
});

function FeedTabsAreaLayout() {
  const { feedId } = useParams({ from: "/_layout/feed/$feedId/_tabs" });

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden max-w-[380px] md:max-w-full border-b border-gray-200">
        <div className="flex space-x-1">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              params={{ feedId }}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
              activeProps={{
                className:
                  "flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-500 -mb-px",
              }}
            >
              <Icon strokeWidth={1} size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}
