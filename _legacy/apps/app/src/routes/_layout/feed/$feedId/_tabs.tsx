import {
  Link,
  Outlet,
  createFileRoute,
  useParams,
  useLocation,
} from "@tanstack/react-router";
import { ListFilter, type LucideIcon, Cpu, Newspaper } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/profile-tabs";

interface TabDefinition {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDefinition[] = [
  {
    to: "/feed/$feedId/content",
    label: "Content",
    icon: Newspaper,
  },
  {
    to: "/feed/$feedId/curation",
    label: "Curation",
    icon: ListFilter,
  },
  {
    to: "/feed/$feedId/processing",
    label: "Processing",
    icon: Cpu,
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
  const location = useLocation();

  // Find the current active tab based on the current pathname
  const currentTab = TABS.find((tab) =>
    location.pathname.includes(tab.to.replace("$feedId", feedId)),
  );
  const activeValue = currentTab?.label || TABS[0]?.label;

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden max-w-fit md:max-w-full">
        <Tabs value={activeValue}>
          <TabsList className="w-full">
            {TABS.map(({ to, label, icon: Icon }) => (
              <TabsTrigger key={label} value={label} asChild>
                <Link
                  to={to}
                  params={{ feedId }}
                  className="flex items-center gap-2"
                >
                  <Icon strokeWidth={1} size={20} />
                  <span>{label}</span>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}
