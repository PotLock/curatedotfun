import { Platform } from "@crosspost/sdk";
import { Button } from "../../../ui/button";
import { ConnectPlatformDialog } from "./components/ConnectPlatformDialog";
import { useConnectedAccounts } from "../../../../store/platformAccountsStore";
import { PlatformAccountItem } from "./components/PlatformAccount";

const SUPPORTED_PLATFORMS = [Platform.TWITTER];

export default function ConnectedAccounts() {
  const { data: connectedAccounts } = useConnectedAccounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center w-full">
        <h3 className="text-2xl font-light">Connected Accounts</h3>
        <ConnectPlatformDialog>
          <Button>Connect Account</Button>
        </ConnectPlatformDialog>
      </div>

      <div className="space-y-4">
        {SUPPORTED_PLATFORMS.map((platform) => {
          const platformAccounts =
            connectedAccounts?.filter(
              (account) => account.platform === platform,
            ) || [];

          return (
            <div key={platform} className="space-y-2">
              <h4 className="font-medium">{platform}</h4>
              {platformAccounts.length > 0 ? (
                <div className="space-y-2">
                  {platformAccounts.map((account) => (
                    <PlatformAccountItem
                      key={account.userId}
                      account={account}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No accounts connected
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
