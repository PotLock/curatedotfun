import { toast } from "../hooks/use-toast";
import { near } from "../lib/near";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface IAuthContext {
  currentAccountId: string | null;
  isSignedIn: boolean;
  setCurrentAccountId: Dispatch<SetStateAction<string | null>>;
  setIsSignedIn: Dispatch<SetStateAction<boolean>>;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => void;
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
  const isSigningInRef = useRef<boolean>(false);
  const previousAccountIdRef = useRef<string | null>(currentAccountId);

  useEffect(() => {
    const accountListener = near.event.onAccount((newAccountId) => {
      setCurrentAccountId(newAccountId);
      setIsSignedIn(!!newAccountId);

      if (newAccountId) {
        // any init?
        // client.setAccountHeader(newAccountId);
      } else {
        // any clean up?
      }
    });

    return () => {
      near.event.offAccount(accountListener);
    };
  }, []);

  useEffect(() => {
    if (currentAccountId && currentAccountId !== previousAccountIdRef.current) {
      if (isSigningInRef.current) {
        toast({
          title: "Success!",
          description: `Connected as: ${currentAccountId}`,
          variant: "success",
        });
        isSigningInRef.current = false;
      }
    } else if (!currentAccountId && previousAccountIdRef.current !== null) {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
        variant: "success",
      });
      if (isSigningInRef.current) {
        isSigningInRef.current = false;
      }
    }
    previousAccountIdRef.current = currentAccountId;
  }, [currentAccountId]);

  const handleSignIn = async (): Promise<void> => {
    isSigningInRef.current = true;
    try {
      await near.requestSignIn();

      // check if a user profile exists for this near account
      // if it doesn't, create it
      // if it does, set in store?
    } catch (e: unknown) {
      toast({
        title: "Sign-in failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      isSigningInRef.current = false;
    }
  };

  const handleSignOut = (): void => {
    near.signOut();
  };

  const contextValue: IAuthContext = {
    currentAccountId,
    isSignedIn,
    setCurrentAccountId,
    setIsSignedIn,
    handleSignIn,
    handleSignOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
