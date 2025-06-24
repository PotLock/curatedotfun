import { fromHex } from "@fastnear/utils";
import { sign } from "near-sign-verify";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "../hooks/use-toast";
import { apiClient } from "../lib/api-client";
import { near } from "../lib/near";

interface IAuthContext {
  currentAccountId: string | null;
  isSignedIn: boolean;
  isAuthorized: boolean;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleAuthorize: () => Promise<void>;
  checkAuthorization: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps): React.ReactElement {
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(
    near.accountId() ?? null,
  );
  const [isSignedIn, setIsSignedIn] = useState<boolean>(
    near.authStatus() === "SignedIn",
  );
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);
  const initialCheckRef = useRef(true);

  const checkAuthorization = useCallback(async () => {
    if (!currentAccountId) {
      setIsAuthorized(false);
      return;
    }
    try {
      await apiClient.makeRequest("GET", "/users/me");
      setIsAuthorized(true);
    } catch (error) {
      console.error("Authorization check failed:", error);
      setIsAuthorized(false);
    }
  }, [currentAccountId]);

  const initiateLogin = useCallback(async (accountId: string) => {
    try {
      const { nonce, recipient } = await apiClient.makeRequest<{
        nonce: string;
        recipient: string;
      }>("POST", "/auth/initiate-login", { accountId });
      setNonce(nonce);
      setRecipient(recipient);
    } catch (error) {
      console.error("Failed to initiate login:", error);
      toast({
        title: "Connection Error",
        description:
          "Unable to connect to authentication server. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    const handleAccountChange = async (newAccountId: string | null) => {
      if (newAccountId === currentAccountId) {
        return;
      }

      setCurrentAccountId(newAccountId);
      setIsSignedIn(!!newAccountId);

      if (newAccountId) {
        toast({
          title: "Wallet Connected",
          description: `Connected as: ${newAccountId}`,
          variant: "success",
        });
        await Promise.all([checkAuthorization(), initiateLogin(newAccountId)]);
      } else {
        toast({
          title: "Wallet Disconnected",
          description: "You have been signed out successfully.",
          variant: "destructive",
        });
        setIsAuthorized(false);
        setNonce(null);
        setRecipient(null);
      }
    };

    const accountListener = near.event.onAccount(handleAccountChange);

    // Initial check
    if (near.accountId() && initialCheckRef.current) {
      initialCheckRef.current = false;
      handleAccountChange(near.accountId()!);
    }

    return () => {
      near.event.offAccount(accountListener);
    };
  }, [checkAuthorization, initiateLogin]);

  const handleSignIn = async (): Promise<void> => {
    try {
      await near.requestSignIn();
    } catch (e: unknown) {
      toast({
        title: "Sign-in failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleAuthorize = async (): Promise<void> => {
    if (!currentAccountId) {
      toast({
        title: "Not Signed In",
        description: "Please sign in before authorizing.",
        variant: "destructive",
      });
      return;
    }
    if (!nonce || !recipient) {
      toast({
        title: "Authorization not ready",
        description: "Please try signing back in.",
        variant: "destructive",
      });
      handleSignOut();
      return;
    }
    try {
      const message = "Authorize Curate.fun";

      const authToken = await sign(message, {
        signer: near,
        recipient: recipient,
        nonce: fromHex(nonce),
      });

      await apiClient.makeRequest("POST", "/auth/verify-login", {
        token: authToken,
        accountId: currentAccountId,
      });

      setIsAuthorized(true);
      toast({
        title: "Authorization Successful!",
        description: "You have successfully authorized the application.",
        variant: "success",
      });
    } catch (e: unknown) {
      setIsAuthorized(false);
      toast({
        title: "Authorization failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await apiClient.makeRequest("POST", "/auth/logout");
    } catch (error) {
      console.error(
        "Logout failed on backend, signing out on client anyway.",
        error,
      );
    }
    near.signOut();
  };

  const contextValue: IAuthContext = {
    currentAccountId,
    isSignedIn,
    isAuthorized,
    handleSignIn,
    handleSignOut,
    handleAuthorize,
    checkAuthorization,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
