import { useState, useEffect } from "react";
import { ReactNode } from "react";
import {
  IProvider,
  WEB3AUTH_NETWORK,
  ADAPTER_EVENTS,
  CHAIN_NAMESPACES,
  WALLET_ADAPTERS,
} from "@web3auth/base";
import {
  CommonPrivateKeyProvider,
  getED25519Key,
} from "@web3auth/base-provider";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { Web3AuthContext } from "../hooks/use-web3-auth";
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import { NearAccountInfo } from "../types/web3auth";

// Define a type for your backend user profile (adjust fields as needed)
interface UserProfile {
  id: number;
  sub_id: string;
  near_account_id: string | null;
  near_public_key: string | null;
  username: string | null;
  email: string | null;
  createdAt: string; // Or Date
  updatedAt: string | null; // Or Date
}

interface Web3AuthProviderProps {
  children: ReactNode;
}

export const Web3AuthProvider = ({ children }: Web3AuthProviderProps) => {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null); // State for backend profile
  const [nearPublicKey, setNearPublicKey] = useState<string | null>(null); // State for derived NEAR public key
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Subscribe to authentication events
  const subscribeAuthEvents = (web3authInstance: Web3AuthNoModal) => {
    web3authInstance.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
      console.log("Connected to Web3Auth", data);
      setIsLoggedIn(true);
      setProvider(web3authInstance.provider);
      // Fetch profile immediately after connection
      await fetchProfileAndNearKey(web3authInstance);
    });

    web3authInstance.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      console.log("Disconnected from Web3Auth");
      setIsLoggedIn(false);
      setProvider(null);
      setCurrentUserProfile(null); // Clear profile on disconnect
      setNearPublicKey(null); // Clear public key on disconnect
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const clientId = import.meta.env.PUBLIC_WEB3_CLIENT_ID;
        const network = import.meta.env.PUBLIC_NETWORK;

        if (!clientId) {
          throw new Error("PUBLIC_WEB3_CLIENT_ID is not set");
        }

        if (!network) {
          throw new Error("PUBLIC_NETWORK is not set");
        }

        let rpcTarget = "";
        let blockExplorerUrl = "";
        let chainId = "";

        if (network.toLowerCase() === "testnet") {
          chainId = "0x4e454153";
          rpcTarget = "https://testnet.aurora.dev";
          blockExplorerUrl = "https://explorer.testnet.aurora.dev";
        } else if (network.toLowerCase() === "mainnet") {
          chainId = "0x4e454152";
          rpcTarget = "https://mainnet.aurora.dev";
          blockExplorerUrl = "https://explorer.mainnet.aurora.dev";
        }

        const chainConfig = {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
          chainId,
          rpcTarget,
          displayName: "Near",
          blockExplorerUrl,
          ticker: "NEAR",
          tickerName: "NEAR",
        };

        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: { chainConfig },
        });

        // Create Web3Auth instance
        const web3AuthInstance = new Web3AuthNoModal({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          privateKeyProvider,
        });

        // Configure auth adapter
        const authAdapter = new AuthAdapter();
        web3AuthInstance.configureAdapter(authAdapter);

        // Subscribe to authentication events
        subscribeAuthEvents(web3AuthInstance);

        await web3AuthInstance.init();

        setWeb3auth(web3AuthInstance);
        if (web3AuthInstance.connected) {
          setProvider(web3AuthInstance.provider);
          setIsLoggedIn(true);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      }
    };

    init();
  }, []);

  // Function to fetch profile and update state
  const fetchProfileAndNearKey = async (authInstance: Web3AuthNoModal) => {
    if (!authInstance.provider) {
      console.log("Provider not available yet in fetchProfileAndNearKey");
      return;
    }

    // Set provider in state
    setProvider(authInstance.provider);

    try {
      // Get private key directly from the provider
      const privateKey = await authInstance.provider.request({
        method: "private_key",
      });

      if (!privateKey) {
        throw new Error("Failed to get private key from Web3Auth");
      }

      // Convert the secp256k1 key to ed25519 key
      const privateKeyEd25519 = getED25519Key(privateKey as string).sk.toString(
        "hex",
      );
      const privateKeyEd25519Buffer = Buffer.from(privateKeyEd25519, "hex");
      const bs58encode = utils.serialize.base_encode(privateKeyEd25519Buffer);
      const keyPair = KeyPair.fromString(`ed25519:${bs58encode}`);

      // Store the public key
      const publicKeyString = keyPair.getPublicKey().toString();
      setNearPublicKey(publicKeyString);

      // Get the ID token for backend authentication
      const idToken = await authInstance.authenticateUser();

      // Call backend to check for existing profile
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${idToken.idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUserProfile(data.profile);
        console.log("User profile found:", data.profile);
      } else if (response.status === 404) {
        setCurrentUserProfile(null);
        console.log("User profile not found (404). Needs creation.");
      } else {
        console.error("Error fetching user profile:", response.statusText);
        setCurrentUserProfile(null);
      }
    } catch (error) {
      console.error("Error during profile fetch/key derivation:", error);
      setCurrentUserProfile(null);
      setNearPublicKey(null);
    }
  };

  // Get NEAR credentials from Web3Auth provider
  const getNearCredentials = async (web3authProvider: IProvider | null) => {
    if (!web3authProvider) {
      throw new Error("Provider is null");
    }
    try {
      // Get private key from Web3Auth
      const privateKey = await web3authProvider.request({
        method: "private_key",
      });
      if (!privateKey) {
        throw new Error("Failed to get private key from Web3Auth");
      }

      // Convert the secp256k1 key to ed25519 key
      const privateKeyEd25519 = getED25519Key(privateKey as string).sk.toString(
        "hex",
      );

      // Convert the private key to Buffer
      const privateKeyEd25519Buffer = Buffer.from(privateKeyEd25519, "hex");

      // Convert the private key to base58
      const bs58encode = utils.serialize.base_encode(privateKeyEd25519Buffer);

      // Convert the base58 private key to KeyPair
      const keyPair = KeyPair.fromString(`ed25519:${bs58encode}`);

      // Get public key
      const publicKeyString = keyPair.getPublicKey().toString();
      setNearPublicKey(publicKeyString);

      return { keyPair, publicKey: publicKeyString };
    } catch (error) {
      console.error("Error getting NEAR credentials:", error);
      throw error;
    }
  };

  // Login with a specific provider
  const login = async (
    loginProvider = "google",
    extraLoginOptions: unknown = {},
  ) => {
    if (!web3auth) {
      console.log("Web3Auth not initialized yet");
      throw new Error("Web3Auth not initialized");
    }

    try {
      // Connect using the specified provider
      const web3authProvider = await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
        loginProvider,
        ...(extraLoginOptions as Record<string, unknown>),
      });

      setProvider(web3authProvider);
      setIsLoggedIn(true);

      // Get NEAR credentials immediately after connecting
      if (web3authProvider) {
        try {
          const credentials = await getNearCredentials(web3authProvider);
          return { provider: web3authProvider, credentials };
        } catch (error) {
          console.error(
            `Error getting NEAR credentials during login with ${loginProvider}:`,
            error,
          );
          return { provider: web3authProvider, error };
        }
      } else {
        console.error("Provider is null after connecting");
        return {
          provider: web3authProvider,
          error: new Error("Provider is null after connecting"),
        };
      }
    } catch (error) {
      console.error(`Login with ${loginProvider} failed:`, error);
      setIsLoggedIn(false);
      throw error;
    }
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("Web3Auth not initialized yet");
      return;
    }
    try {
      await web3auth.logout();
      setProvider(null);
      setIsLoggedIn(false);
      setCurrentUserProfile(null); // Clear profile on logout
      setNearPublicKey(null); // Clear public key on logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getUserInfo = async () => {
    if (!web3auth || !provider) {
      throw new Error("Web3Auth not initialized or provider not set");
    }
    const userInfo = await web3auth.getUserInfo();
    return userInfo;
  };

  const getNearAccount = async (): Promise<NearAccountInfo> => {
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    const network = import.meta.env.PUBLIC_NETWORK;
    if (!network) {
      throw new Error("PUBLIC_NETWORK is not set");
    }

    try {
      let rpcTarget = "";
      let blockExplorerUrl = "";
      let walletUrl = "";
      let helperUrl = "";

      if (network.toLowerCase() === "testnet") {
        rpcTarget = "https://rpc.testnet.near.org";
        blockExplorerUrl = "https://explorer.testnet.near.org";
        walletUrl = "https://wallet.testnet.near.org";
        helperUrl = "https://helper.testnet.near.org";
      } else if (network.toLowerCase() === "mainnet") {
        rpcTarget = "https://rpc.mainnet.near.org";
        blockExplorerUrl = "https://explorer.near.org";
        walletUrl = "https://wallet.near.org";
        helperUrl = "https://helper.mainnet.near.org";
      }

      const privateKey = await provider.request({
        method: "private_key",
      });
      if (!privateKey) {
        throw new Error("Failed to get private key from Web3Auth");
      }

      // Convert the secp256k1 key to ed25519 key
      const privateKeyEd25519 = getED25519Key(privateKey as string).sk.toString(
        "hex",
      );

      // Convert the private key to Buffer
      const privateKeyEd25519Buffer = Buffer.from(privateKeyEd25519, "hex");

      // Convert the private key to base58
      const bs58encode = utils.serialize.base_encode(privateKeyEd25519Buffer);

      // Convert the base58 private key to KeyPair
      const keyPair = KeyPair.fromString(`ed25519:${bs58encode}`);

      // Get public key and derive account ID
      const publicKey = keyPair.getPublicKey();
      const accountId = Buffer.from(publicKey.data).toString("hex");

      // Setup NEAR connection with retry logic
      const myKeyStore = new keyStores.InMemoryKeyStore();
      await myKeyStore.setKey(network, accountId, keyPair);

      const connectionConfig = {
        networkId: network,
        keyStore: myKeyStore,
        nodeUrl: rpcTarget,
        walletUrl,
        helperUrl,
        explorerUrl: blockExplorerUrl,
        headers: {},
      };

      const nearConnection = await connect(connectionConfig);

      // Verify account exists and is accessible
      const account = await nearConnection.account(accountId);
      await account.state();

      return { account, accountId, keyPair };
    } catch (error) {
      console.error("NEAR account initialization error:", error);
      throw new Error(
        "Failed to initialize NEAR account: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  return (
    <Web3AuthContext.Provider
      value={{
        web3auth,
        provider,
        isInitialized,
        isLoggedIn,
        login,
        logout,
        getUserInfo,
        getNearAccount,
        getNearCredentials,
        currentUserProfile, // Expose profile state
        nearPublicKey, // Expose public key state
        setCurrentUserProfile, // Expose setter if needed by creation modal/flow
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
};
