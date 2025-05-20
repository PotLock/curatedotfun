import type { NetworkId } from "@near-wallet-selector/core";
import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";

export function NearWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletSelectorProvider
      config={{
        modules: [
          setupMyNearWallet() as any,
          setupHereWallet(),
          setupMeteorWallet(),
        ],
        network: (process.env.PUBLIC_NETWORK || "testnet") as NetworkId,
        createAccessKeyFor: process.env.PUBLIC_SMART_CONTRACT,
      }}
    >
      {children}
    </WalletSelectorProvider>
  );
}
