import { RefreshCw, Twitter } from "lucide-react";
import { PlatformAccountItem } from "./PlatformAccount";
import { ConnectPlatform } from "./ConnectPlatform";
import { ConnectedAccount, Platform, PlatformName } from "@crosspost/types";

interface PlatformAccountListProps {
  platform: PlatformName;
  accounts: ConnectedAccount[];
  isLoading: boolean;
}

export function PlatformAccountList({
  platform,
  accounts,
  isLoading,
}: PlatformAccountListProps) {
  const filteredAccounts = accounts.filter(
    (account) => account.platform === platform.toLowerCase(),
  );

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-semibold capitalize">
          {platform} Accounts
        </h2>
        <ConnectPlatform platform={platform} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw size={16} className={"animate-spin"} />
        </div>
      ) : (
        <>
          {filteredAccounts.length === 0 ? (
            <div className="rounded-md border-2 border-dashed border-gray-200 p-4 sm:p-8 text-center">
              {platform === Platform.TWITTER && (
                <Twitter className="mx-auto h-12 w-12 text-gray-400" />
              )}
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No {platform} accounts connected
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Connect your {platform} accounts to start crossposting
              </p>
              <div className="mt-6">
                <ConnectPlatform
                  platform={platform}
                  size="default"
                  showIcon={true}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {filteredAccounts.map((account) => (
                <PlatformAccountItem key={account.userId} account={account} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
