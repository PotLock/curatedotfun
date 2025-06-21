import { sign } from "near-sign-verify";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "../hooks/use-toast";
import { apiClient } from "../lib/api-client";
import { near } from "../lib/near";
import { fromHex } from "@fastnear/utils";

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
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  const checkAuthorization = useCallback(async () => {
    try {
      await apiClient.makeRequest("GET", "/users/me");
      setIsAuthorized(true);
    } catch (error) {
      console.error("Authorization check failed:", error);
      setIsAuthorized(false);
    }
  }, []);

  useEffect(() => {
    const accountId = near.accountId();
    if (accountId) {
      setCurrentAccountId(accountId);
      setIsSignedIn(true);
      checkAuthorization();
    }
  }, [checkAuthorization]);

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
    try {
      const { nonce, recipient } = await apiClient.makeRequest<{
        nonce: string;
        recipient: string;
      }>("POST", "/auth/initiate-login", { accountId: currentAccountId });

      const message = "Authorize Curate.fun";

      const authToken = await sign(message, {
        signer: near,
        recipient,
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
    setCurrentAccountId(null);
    setIsSignedIn(false);
    setIsAuthorized(false);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
      variant: "success",
    });
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
