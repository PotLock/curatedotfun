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
import { useCreateUserProfile } from "../lib/api/users";
import { UserProfile } from "../lib/validation/user";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const { mutateAsync: createUserProfile, isPending: isCreatingUser } =
    useCreateUserProfile();

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

        (async () => {
          try {
            let userProfile: UserProfile | null = null;
            try {
              userProfile = await queryClient.fetchQuery<
                UserProfile | null,
                Error,
                UserProfile | null,
                readonly ["userByNearAccountId", string | null]
              >({
                queryKey: ["userByNearAccountId", currentAccountId],
                queryFn: async () => {
                  const response = await fetch(
                    `/api/users/by-near/${currentAccountId}`,
                    {
                      headers: {
                        // Add any necessary headers like Authorization if your API client does
                      },
                    },
                  );
                  if (response.status === 404) {
                    return null; // User not found
                  }
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                      errorData.error ||
                        `Failed to fetch user: ${response.statusText}`,
                    );
                  }
                  const data = await response.json();
                  return data.profile as UserProfile;
                },
                retry: 1,
              });
            } catch (fetchError: unknown) {
              const error = fetchError as { message?: string; status?: number }; // Type assertion
              if (
                error.message &&
                !error.message.toLowerCase().includes("not found") &&
                error.status !== 404
              ) {
                console.error("Error fetching user profile:", error);
                toast({
                  title: "Profile Check Failed",
                  description:
                    "Could not verify your user profile. Please try again.",
                  variant: "destructive",
                });
                isSigningInRef.current = false;
                return;
              }
            }

            if (!userProfile && !isCreatingUser) {
              try {
                await createUserProfile({
                  username: currentAccountId,
                  near_public_key: currentAccountId,
                });
                toast({
                  title: "Account Created",
                  description: "Your profile has been successfully set up.",
                  variant: "success",
                });
                await queryClient.invalidateQueries({
                  queryKey: ["userByNearAccountId", currentAccountId],
                });
                await queryClient.invalidateQueries({
                  queryKey: ["currentUserProfile"],
                });
              } catch (creationError: unknown) {
                const error = creationError as Error; // Assuming it's a standard Error object
                console.error("Error creating user profile:", error);
                toast({
                  title: "Account Creation Failed",
                  description:
                    error.message || "Could not create your user profile.",
                  variant: "destructive",
                });
              }
            }
          } finally {
            isSigningInRef.current = false;
          }
        })();
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
  }, [currentAccountId, queryClient, createUserProfile, isCreatingUser]);

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
