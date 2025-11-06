import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from "@tanstack/react-router";
import {
  Activity,
  Newspaper,
  ScanSearch,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabDefinition {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDefinition[] = [
  {
    to: "/profile/overview",
    label: "Overview",
    icon: ScanSearch,
  },
  {
    to: "/profile/my-feeds",
    label: "My Feeds",
    icon: Newspaper,
  },
  {
    to: "/profile/activity",
    label: "Activity",
    icon: Activity,
  },
  {
    to: "/profile/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const Route = createFileRoute("/_layout/profile/_tabs")({
  component: ProfileTabsAreaLayout,
});

function ProfileTabsAreaLayout() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const activeTab = TABS.find((tab) => currentPath.startsWith(tab.to));

  return (
    <Tabs value={activeTab?.to ?? currentPath}>
      <TabsList>
        {TABS.map(({ to, label, icon: Icon }) => (
          <Link key={label} to={to}>
            <TabsTrigger value={to}>
              <Icon strokeWidth={1} size={20} />
              <span>{label}</span>
            </TabsTrigger>
          </Link>
        ))}
      </TabsList>
      <div className="mt-4">
        <Outlet />
      </div>
    </Tabs>
  );
}
