import { useState, useEffect } from "react";
import { ReactNode } from "react";
import {
  IProvider,
  WEB3AUTH_NETWORK,
  ADAPTER_EVENTS,
  getEvmChainConfig,
} from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/modal";
import { Web3AuthContext } from "../hooks/use-web3-auth";

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

        if (!clientId) {
          throw new Error("PUBLIC_WEB3_CLIENT_ID is not set");
        }

        const chainConfig = getEvmChainConfig(11155111, clientId);

        if (!chainConfig) {
          throw new Error("Chain config not found");
        }

        // Create Web3Auth instance
        const web3AuthInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          chainConfig,
          privateKeyProvider: new EthereumPrivateKeyProvider({
            config: { chainConfig },
          }),
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

  return (
    <Web3AuthContext.Provider
      value={{
        web3auth,
        provider,
        isInitialized,
        isLoggedIn,
        login,
        logout,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
};
