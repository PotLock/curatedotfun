import { Platform, type ConnectedAccount } from "@crosspost/types";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectPlatform } from "../../../../components/buttons/ConnectPlatform";
import { Container } from "../../../../components/Container";
import { Button } from "../../../../components/ui/button";
import { useAuth } from "../../../../contexts/auth-context";
import { useConnectedAccounts } from "../../../../lib/crosspost";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/profile/settings/")({
  component: SettingsPageComponent,
});

function SettingsPageComponent() {
  const { isSignedIn, currentAccountId, handleSignIn } = useAuth();
  const {
    connectedAccounts,
    isLoading: isLoadingAccounts,
    error,
  } = useConnectedAccounts();

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

          <Tabs defaultValue="connections">
            <TabsList>
              <TabsTrigger value="connections">Connected Accounts</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="mt-4">
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-semibold">Platform Connections</h2>

                {isLoadingAccounts && <p>Loading connected accounts...</p>}
                {error && <p className="text-red-500">Error: {error}</p>}

                <div>
                  <h2 className="text-xl font-medium mb-3">
                    Connect New Account
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    <ConnectPlatform platform={Platform.TWITTER} />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-medium mb-3">
                    Connected Accounts
                  </h2>
                  {connectedAccounts && connectedAccounts.length > 0 ? (
                    <ul className="space-y-3">
                      {connectedAccounts.map((account: ConnectedAccount) => (
                        <li
                          key={`${account.platform}-${account.userId}`}
                          className="p-4 border rounded-md shadow-sm"
                        >
                          <p className="font-semibold">
                            Platform: {account.platform}
                          </p>
                          <p>User ID: {account.userId}</p>
                          {account.profile?.username && (
                            <p>Username: {account.profile.username}</p>
                          )}
                          {account.profile?.profileImageUrl && (
                            <img
                              src={account.profile?.profileImageUrl}
                              alt={`${account.profile?.username} profile`}
                              className="w-10 h-10 rounded-full mt-2"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !isLoadingAccounts &&
                    !error && <p>No accounts connected yet.</p>
                  )}
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="notifications" className="mt-4">
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-semibold">
                  Notification Settings
                </h2>
                <p>Manage your notification preferences here.</p>
                {/* Add notification settings form or options here */}
              </Card>
            </TabsContent>
            <TabsContent value="preferences" className="mt-4">
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-semibold">User Preferences</h2>
                <p>Set your preferences for the application.</p>
                {/* Add user preferences form or options here */}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </main>
  );
}
