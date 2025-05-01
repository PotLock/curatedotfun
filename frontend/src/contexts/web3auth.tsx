import { useState, useEffect } from "react";
import { ReactNode } from "react";
import {
  IProvider,
  WEB3AUTH_NETWORK,
  ADAPTER_EVENTS,
  CHAIN_NAMESPACES,
} from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { Web3Auth } from "@web3auth/modal";
import { Web3AuthContext } from "../hooks/use-web3-auth";
import { connect, KeyPair, keyStores, utils } from "near-api-js";
import { getED25519Key } from "@web3auth/base-provider";
import { NearAccountInfo } from "../types/web3auth";

interface Web3AuthProviderProps {
  children: ReactNode;
}

export const Web3AuthProvider = ({ children }: Web3AuthProviderProps) => {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
        const web3AuthInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          chainConfig,
          privateKeyProvider,
        });

        // Subscribe to authentication events
        subscribeAuthEvents(web3AuthInstance);

        await web3AuthInstance.initModal();

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

  const subscribeAuthEvents = (web3auth: Web3Auth) => {
    web3auth.on(ADAPTER_EVENTS.CONNECTED, (data) => {
      console.log("Connected to Web3Auth", data);
      setIsLoggedIn(true);
      setProvider(web3auth.provider);
    });

    web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      console.log("Disconnected from Web3Auth");
      setIsLoggedIn(false);
      setProvider(null);
    });
  };

  const login = async () => {
    if (!web3auth) {
      console.log("Web3Auth not initialized yet");
      return;
    }
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error logging in:", error);
      setIsLoggedIn(false);
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
    if (!web3auth?.provider) {
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

      // Get private key from Web3Auth
      const privateKey = await web3auth.provider.request({
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
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
};
