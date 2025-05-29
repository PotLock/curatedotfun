import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthContextType, AuthMethod, AuthUser } from "../types/auth";

import { AuthAdapter } from "@web3auth/auth-adapter";
import {
  ADAPTER_EVENTS,
  CHAIN_NAMESPACES,
  IProvider,
  WALLET_ADAPTERS,
  WEB3AUTH_NETWORK,
} from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { Web3AuthNoModal } from "@web3auth/no-modal";

import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import type { NetworkId } from "@near-wallet-selector/core";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
import {
  WalletSelectorProvider,
  useWalletSelector,
} from "@near-wallet-selector/react-hook";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

const web3AuthClientId = import.meta.env.PUBLIC_WEB3_CLIENT_ID;
const appNetwork = (process.env.PUBLIC_NETWORK || "testnet") as NetworkId;
const smartContractId = process.env.PUBLIC_SMART_CONTRACT;

export const UnifiedAuthProvider = ({ children }: UnifiedAuthProviderProps) => {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [web3authProvider, setWeb3authProvider] = useState<IProvider | null>(
    null,
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true during init
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);

  // NEAR Wallet Selector hook - can only be called inside WalletSelectorProvider context
  // So, we'll need a sub-component or careful structuring.
  // For now, let's assume we can access its methods when needed.

  // Initialize Web3Auth
  useEffect(() => {
    const initWeb3Auth = async () => {
      if (!web3AuthClientId) {
        console.error("PUBLIC_WEB3_CLIENT_ID is not set for Web3Auth");
        setIsLoading(false);
        return;
      }
      try {
        let rpcTarget = "";
        let chainId = "";
        if (appNetwork.toLowerCase() === "testnet") {
          chainId = "0x4e454153"; // NEAR Testnet Chain ID for Aurora
          rpcTarget = "https://testnet.aurora.dev";
        } else if (appNetwork.toLowerCase() === "mainnet") {
          chainId = "0x4e454152"; // NEAR Mainnet Chain ID for Aurora
          rpcTarget = "https://mainnet.aurora.dev";
        }

        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          chainId,
          rpcTarget,
          displayName: "Near",
          blockExplorerUrl:
            appNetwork.toLowerCase() === "testnet"
              ? "https://explorer.testnet.near.org"
              : "https://explorer.mainnet.near.org",
          ticker: "NEAR",
          tickerName: "NEAR",
        };

        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: { chainConfig },
        });
        const w3a = new Web3AuthNoModal({
          clientId: web3AuthClientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // Or appropriate network
          privateKeyProvider,
        });

        const authAdapter = new AuthAdapter(); // Using OpenLoginAdapter by default
        w3a.configureAdapter(authAdapter);

        w3a.on(ADAPTER_EVENTS.CONNECTED, async (provider) => {
          console.log("Web3Auth Connected");
          setWeb3authProvider(w3a.provider);
          setIsLoading(true);
          try {
            const authResult = await w3a.authenticateUser();
            setIdToken(authResult.idToken);
            // Fetch user profile from backend
            const profileResponse = await fetch("/api/users/me", {
              headers: { Authorization: `Bearer ${authResult.idToken}` },
            });
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              setUser(profileData.profile as AuthUser);
            } else if (profileResponse.status === 404) {
              setUser(null); // User exists on Web3Auth but not in our backend
            } else {
              throw new Error(
                `Failed to fetch profile: ${profileResponse.statusText}`,
              );
            }
            setIsLoggedIn(true);
            setAuthMethod("web3auth");
          } catch (error) {
            console.error("Error during Web3Auth post-connection:", error);
            // Potentially logout or clear partial state
            setIdToken(null);
            setUser(null);
            setIsLoggedIn(false);
          } finally {
            setIsLoading(false);
          }
        });

        w3a.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          console.log("Web3Auth Disconnected");
          setWeb3authProvider(null);
          setUser(null);
          setIdToken(null);
          setIsLoggedIn(false);
          setAuthMethod(null);
          setIsLoading(false);
        });

        await w3a.init();
        setWeb3auth(w3a);
        if (w3a.connected && w3a.provider) {
          // If already connected (e.g. session restored), trigger connected logic
          w3a.emit(ADAPTER_EVENTS.CONNECTED, w3a.provider);
        }
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      } finally {
        setIsLoading(false); // Ensure loading is false after init attempt
      }
    };
    initWeb3Auth();
  }, []);

  const loginWithWeb3Auth = useCallback(
    async (loginProvider?: string) => {
      if (!web3auth) throw new Error("Web3Auth not initialized");
      setIsLoading(true);
      try {
        await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
          loginProvider: loginProvider || "google",
        });
        // Event listener for CONNECTED will handle the rest (token, profile)
      } catch (error) {
        console.error("Web3Auth login error:", error);
        setIsLoading(false);
        // No need to setLoggedIn(false) here as DISCONNECTED event should handle it if connection fails
      }
    },
    [web3auth],
  );

  const loginWithNearWallet = useCallback(
    async (selector: ReturnType<typeof useWalletSelector>) => {
      // This function will be called by a component that has access to useWalletSelector()
      if (!selector) throw new Error("NEAR Wallet Selector not available");
      setIsLoading(true);
      try {
        // For simplicity, assuming the first account if multiple are selected/available.
        // Or prompt user to select an account if selector.accounts.length > 1
        const account = selector.accounts[0];
        if (!account) {
          // This typically means the user needs to connect/select a wallet first.
          // The UI component calling this should handle wallet selection modal via selector.showModal()
          console.log(
            "No NEAR account selected/connected via Wallet Selector.",
          );
          // Example: selector.showModal(); // if you want to trigger wallet selection
          setIsLoading(false);
          return;
        }

        // 1. Get nonce from backend (placeholder)
        // const nonceResponse = await fetch(`/api/auth/near/nonce?accountId=${account.accountId}`);
        // if (!nonceResponse.ok) throw new Error('Failed to get nonce');
        // const { nonce } = await nonceResponse.json();
        const nonce = `Sign this message to login: ${Date.now()}`; // Placeholder nonce

        // 2. Sign nonce
        const wallet = await selector.wallet();
        if (!wallet || wallet.type === "browser") {
          // `wallet.type === 'browser'` check might be too restrictive, adjust as needed
          throw new Error(
            "Wallet not available or not a signable type for this flow.",
          );
        }

        const signedMessage = await wallet.signMessage({
          message: nonce,
          recipient: smartContractId || account.accountId, // recipient can be contract or self
          nonce: Buffer.from(String(Date.now())), // Nonce for signing, different from message nonce
        });

        if (!signedMessage)
          throw new Error("Failed to sign message with NEAR wallet");

        // 3. Send to backend for verification and get JWT (placeholder)
        // const verifyResponse = await fetch('/api/auth/near/verify', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     accountId: account.accountId,
        //     publicKey: signedMessage.publicKey.toString(), // Ensure publicKey is in correct format
        //     signature: signedMessage.signature,
        //     message: nonce, // Send original nonce for verification
        //   }),
        // });
        // if (!verifyResponse.ok) throw new Error('NEAR auth verification failed');
        // const { token, profile } = await verifyResponse.json();

        // Placeholder for token and profile
        const token = `fake-near-jwt-for-${account.accountId}`;
        const profile: AuthUser = {
          id: Math.random(),
          sub_id: `near:${account.accountId}`,
          near_account_id: account.accountId,
          near_public_key: signedMessage.publicKey.toString(),
          username: account.accountId.split(".")[0],
          email: null,
          createdAt: new Date().toISOString(),
          updatedAt: null,
        };

        setIdToken(token);
        setUser(profile);
        setIsLoggedIn(true);
        setAuthMethod("near_wallet");
      } catch (error) {
        console.error("NEAR Wallet login error:", error);
        setIdToken(null);
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    if (authMethod === "web3auth" && web3auth && web3auth.connected) {
      await web3auth.logout(); // This should trigger DISCONNECTED event
    } else if (authMethod === "near_wallet") {
      // How to get selector here? This is a challenge.
      // Option 1: Pass selector to logout.
      // Option 2: Store wallet instance from login.
      // For now, just clear state. Proper logout needs wallet instance.
      console.warn(
        "NEAR Wallet logout needs wallet instance from useWalletSelector. Clearing local state only.",
      );
      setIdToken(null);
      setUser(null);
      setIsLoggedIn(false);
      setAuthMethod(null);
    } else {
      // Fallback for unknown state
      setIdToken(null);
      setUser(null);
      setIsLoggedIn(false);
      setAuthMethod(null);
    }
    // DISCONNECTED event for Web3Auth should set loading to false.
    // For NEAR, or if no event, set it manually.
    if (authMethod !== "web3auth") {
      setIsLoading(false);
    }
  }, [web3auth, authMethod]);

  const login = useCallback(
    async (
      method: "web3auth" | "near_wallet",
      options?: {
        loginProvider?: string;
        selector?: ReturnType<typeof useWalletSelector>;
      },
    ) => {
      if (method === "web3auth") {
        await loginWithWeb3Auth(options?.loginProvider);
      } else if (method === "near_wallet") {
        if (!options?.selector) {
          console.error("NEAR Wallet login requires 'selector' in options.");
          setIsLoading(false); // Ensure loading is reset
          return;
        }
        await loginWithNearWallet(options.selector);
      }
    },
    [loginWithWeb3Auth, loginWithNearWallet],
  );

  // This sub-component allows using useWalletSelector within the AuthProvider
  const AuthProviderInternal = ({
    children: internalChildren,
  }: {
    children: ReactNode;
  }) => {
    const selector = useWalletSelector(); // Now this is valid

    // We can pass `selector` to `loginWithNearWallet` or `logout` if needed,
    // or make login/logout methods on the context accept it.
    // The current `login` function is designed to accept selector in options.
    // For logout, it's trickier if we don't store the wallet instance.
    // A common pattern is for the UI component triggering logout to also have access to `selector`
    // and call `wallet.signOut()`. The context logout would then primarily clear state.

    return (
      <AuthContext.Provider
        value={{
          isLoggedIn,
          isLoading,
          user,
          idToken,
          authMethod,
          login,
          logout,
        }}
      >
        {internalChildren}
      </AuthContext.Provider>
    );
  };

  return (
    <WalletSelectorProvider
      config={{
        modules: [
          setupMyNearWallet(),
          setupHereWallet(),
          setupMeteorWallet(),
          setupBitteWallet(),
          setupIntearWallet(),
        ],
        network: appNetwork,
        createAccessKeyFor: smartContractId || undefined,
      }}
    >
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </WalletSelectorProvider>
  );
};
