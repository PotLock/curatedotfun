import {
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../../../components/ui/tabs";

export const Route = createFileRoute("/_layout/profile/_tabs/settings/_tabs")({
  component: SettingsTabsAreaLayout,
});

function SettingsTabsAreaLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      value: "connections",
      path: "/profile/settings/connections",
      label: "Connected Accounts",
    },
    {
      value: "notifications",
      path: "/profile/settings/notifications",
      label: "Notifications",
    },
    {
      value: "preferences",
      path: "/profile/settings/preferences",
      label: "Preferences",
    },
  ];

  const getCurrentTab = () => {
    const currentItem = navigationItems.find(
      (item) => location.pathname === item.path,
    );
    return currentItem?.value || "connections";
  };

  const handleTabChange = (value: string) => {
    const item = navigationItems.find((nav) => nav.value === value);
    if (item) {
      navigate({ to: item.path });
    }
  };

  return (
    <Tabs
      value={getCurrentTab()}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="w-full justify-start">
        {navigationItems.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={getCurrentTab()} className="mt-6">
        <Outlet />
      </TabsContent>
    </Tabs>
  );
}
