import { Platform, type ConnectedAccount } from "@crosspost/types";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectPlatform } from "../../../../../../components/buttons/ConnectPlatform";
import { Card } from "../../../../../../components/ui/card";
import { useConnectedAccounts } from "../../../../../../lib/crosspost";

export const Route = createFileRoute(
  "/_layout/profile/_tabs/settings/_tabs/connections",
)({
  component: ConnectionsComponent,
});

function ConnectionsComponent() {
  const {
    connectedAccounts,
    isLoading: isLoadingAccounts,
    error,
  } = useConnectedAccounts();

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Platform Connections</h2>

      {isLoadingAccounts && <p>Loading connected accounts...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div>
        <h2 className="text-xl font-medium mb-3">Connect New Account</h2>
        <div className="flex flex-wrap gap-4">
          <ConnectPlatform platform={Platform.TWITTER} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium mb-3">Connected Accounts</h2>
        {connectedAccounts && connectedAccounts.length > 0 ? (
          <ul className="space-y-3">
            {connectedAccounts.map((account: ConnectedAccount) => (
              <li
                key={`${account.platform}-${account.userId}`}
                className="p-4 border rounded-md shadow-sm"
              >
                <p className="font-semibold">Platform: {account.platform}</p>
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
          !isLoadingAccounts && !error && <p>No accounts connected yet.</p>
        )}
      </div>
    </Card>
  );
}
