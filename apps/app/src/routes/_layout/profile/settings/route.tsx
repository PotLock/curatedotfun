import {
  Outlet,
  useLocation,
  useNavigate,
  createFileRoute,
} from "@tanstack/react-router";
import { Container } from "../../../../components/Container";
import { Button } from "../../../../components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../../components/ui/tabs";
import { useAuth } from "../../../../contexts/auth-context";

export const Route = createFileRoute("/_layout/profile/settings")({
  component: SettingsPageComponent,
});

function SettingsPageComponent() {
  const { isSignedIn, currentAccountId, handleSignIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation items
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

  // Get current tab based on pathname
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

  if (!isSignedIn || !currentAccountId) {
    return (
      <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
        <div className="min-h-screen mx-auto max-w-[1440px] flex flex-col gap-4 items-center justify-center">
          <h1>Please Login to Continue</h1>
          <Button onClick={handleSignIn}>Login</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 lg:max-w-6xl xl:max-w-7xl">
      <Container>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-[30px]">Settings</h1>
            <p className="font-[Geist] text-sm font-medium">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Navigation using Tabs UI */}
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
        </div>
      </Container>
    </main>
  );
}
