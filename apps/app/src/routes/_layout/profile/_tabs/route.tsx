import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Container } from "../../../../components/Container";
import { ProfileHeader } from "../../../../components/profile/ProfileHeader";
import { Button } from "../../../../components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/profile-tabs";
import { useAuth } from "../../../../contexts/auth-context";
import { Activity, Newspaper, ScanSearch } from "lucide-react";

export const Route = createFileRoute("/_layout/profile/_tabs")({
  component: RouteComponent,
});

const navigationItems = [
  {
    value: "overview",
    path: "/profile/overview",
    label: "Overview",
    icon: ScanSearch,
  },
  {
    value: "my-feeds",
    path: "/profile/my-feeds",
    label: "My Feeds",
    icon: Newspaper,
  },
  {
    value: "activity",
    path: "/profile/activity",
    label: "Activity",
    icon: Activity,
  },
];

function RouteComponent() {
  const { isSignedIn, currentAccountId, handleSignIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    const path = location.pathname;
    const tab = navigationItems.find((item) => path.startsWith(item.path));
    return tab?.value || "overview";
  };

  const handleTabChange = (value: string) => {
    const item = navigationItems.find((item) => item.value === value);
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
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          <ProfileHeader accountId={currentAccountId} />

          <Tabs
            value={getCurrentTab()}
            onValueChange={handleTabChange}
            className="w-full space-y-[30px]"
          >
            <TabsList className="overflow-x-auto">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <TabsTrigger key={item.value} value={item.value}>
                    <IconComponent strokeWidth={1} size={24} />
                    {item.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="w-full">
              <Outlet />
            </div>
          </Tabs>
        </div>
      </Container>
    </main>
  );
}
