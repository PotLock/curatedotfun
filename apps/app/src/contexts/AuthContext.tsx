import { KeyPair } from "near-api-js";
import { sign } from "near-sign-verify"; // For NEAR message signing
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { getCurrentUserProfile, createUserProfile as rawCreateUserProfile } from "../lib/api";
import { near } from "../lib/near";
import { useAuthStore } from "../store/auth-store";
import {
  AuthContextType,
  AuthMethod,
  NearAccountDetails,
  UserProfile,
} from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for initial check
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [nearAccountDetails, setNearAccountDetails] =
    useState<NearAccountDetails | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // From useWeb3Auth hook
  const web3AuthHook = useWeb3Auth();
  const {
    web3auth: web3AuthInstanceFromHook, // Renaming to avoid conflict
    provider: web3AuthProviderFromHook, // Renaming
    login: web3AuthLoginInternal,
    logout: web3AuthLogoutInternal,
    getNearAccount: getWeb3AuthNearAccountInternal,
    getNearCredentials: getWeb3AuthNearCredentialsInternal,
    isInitialized: isWeb3AuthInitialized,
    isLoggedIn: isWeb3AuthLoggedIn,
    currentUserProfile: web3AuthUserProfile, // To sync on initial load
  } = web3AuthHook;

  const { showCreateAccountModal, closeModal, currentModal } = useAuthStore();

  // Helper to fetch profile
  const fetchUserProfile =
    useCallback(async (): Promise<UserProfile | null> => {
      setError(null);
      const tokenPurpose = "fetch user profile";
      let token: string | null = null;

      if (authMethod === "web3auth" && web3AuthInstanceFromHook) {
        try {
          const authResult = await web3AuthInstanceFromHook.authenticateUser();
          token = authResult.idToken;
        } catch (e) {
          console.error("Web3Auth authenticateUser failed:", e);
          setError(e as Error);
          return null;
        }
      } else if (authMethod === "near" && nearAccountDetails?.accountId) {
        try {
          token = nearAccountDetails?.accountId;
          // token = await sign({
          //   signer: near,
          //   recipient: "curatefun.near", // Replace with actual recipient if different
          //   message: tokenPurpose,
          // });
        } catch (e) {
          console.error("NEAR sign message failed:", e);
          setError(e as Error);
          return null;
        }
      }

      if (token) {
        try {
          setIsLoading(true);
          const profile = await getCurrentUserProfile(token);
          setUserProfile(profile);
          return profile;
        } catch (e) {
          console.error("Failed to fetch user profile:", e);
          setError(e as Error);
          setUserProfile(null); // Clear profile on error
          return null;
        } finally {
          setIsLoading(false);
        }
      }
      return null;
    }, [authMethod, web3AuthInstanceFromHook, nearAccountDetails?.accountId]);

  // Function to get NEAR details for NEAR direct login
  const getNearDirectLoginDetails =
    useCallback(async (): Promise<NearAccountDetails | null> => {
      if (near.authStatus() === "SignedIn") {
        const accountId = near.accountId();
        try {
          const publicKey = near.getPublicKeyForContract();
          return { accountId: accountId!, publicKey: publicKey! };
        } catch (err) {
          console.error(
            "Error fetching public key for NEAR direct login:",
            err,
          );
        }
      }
      return null;
    }, []);

  // Initialization effect
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isWeb3AuthInitialized && isWeb3AuthLoggedIn) {
          setAuthMethod("web3auth");
          setIsLoggedIn(true);
          const w3aNearInfo = await getWeb3AuthNearAccountInternal();
          if (w3aNearInfo) {
            const pk = w3aNearInfo.keyPair.getPublicKey().toString();
            setNearAccountDetails({
              accountId: w3aNearInfo.accountId,
              publicKey: pk,
            });
          }
          // Sync profile from Web3Auth context initially, then fetch from backend
          if (web3AuthUserProfile) setUserProfile(web3AuthUserProfile);
          await fetchUserProfile();
        } else if (near.authStatus() === "SignedIn") {
          setAuthMethod("near");
          setIsLoggedIn(true);
          const nearDirectDetails = await getNearDirectLoginDetails();
          if (nearDirectDetails) setNearAccountDetails(nearDirectDetails);
          await fetchUserProfile();
        } else {
          // Not logged in with either
          setAuthMethod(null);
          setIsLoggedIn(false);
          setUserProfile(null);
          setNearAccountDetails(null);
        }
      } catch (e) {
        console.error("Auth initialization error:", e);
        setError(e as Error);
        setAuthMethod(null);
        setIsLoggedIn(false);
        setUserProfile(null);
        setNearAccountDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // NEAR account change listener
    const accountListener = near.event.onAccount(async (newAccountId) => {
      console.log("NEAR Account ID Update via listener:", newAccountId);
      if (newAccountId) {
        if (
          authMethod !== "near" ||
          nearAccountDetails?.accountId !== newAccountId
        ) {
          setIsLoading(true);
          setAuthMethod("near");
          setIsLoggedIn(true);
          const details = await getNearDirectLoginDetails();
          if (details) setNearAccountDetails(details);
          await fetchUserProfile(); // Refetch profile for new/changed account
          setIsLoading(false);
        }
      } else {
        // User signed out from NEAR wallet externally
        if (authMethod === "near") {
          setIsLoading(true);
          setAuthMethod(null);
          setIsLoggedIn(false);
          setUserProfile(null);
          setNearAccountDetails(null);
          setError(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      near.event.offAccount(accountListener);
    };
  }, [
    isWeb3AuthInitialized,
    isWeb3AuthLoggedIn,
    getWeb3AuthNearAccountInternal,
    fetchUserProfile,
    getNearDirectLoginDetails,
    web3AuthUserProfile,
    authMethod, // Added to re-evaluate if authMethod changes externally (less likely)
    nearAccountDetails?.accountId, // Added to re-evaluate if accountId changes
  ]);

  // Login function
  const login = useCallback(
    async (
      method: "web3auth" | "near",
      web3AuthOptions?: {
        loginProvider?: string;
        extraLoginOptions?: unknown;
      },
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        if (method === "web3auth") {
          await web3AuthLoginInternal(
            web3AuthOptions?.loginProvider,
            web3AuthOptions?.extraLoginOptions,
          );
          // State updates (isLoggedIn, authMethod, nearAccountDetails, userProfile)
          // will be triggered by the change in web3AuthHook's state (isWeb3AuthLoggedIn),
          // which then re-runs the main useEffect.
          // Explicitly set authMethod here to ensure it's 'web3auth' before useEffect runs.
          setAuthMethod("web3auth");
          // The main useEffect will handle fetching profile and details.
        } else if (method === "near") {
          await near.requestSignIn({
            contractId: "curatefun.near", // Replace with actual contract if different
            // methodNames: [], // optional
            // successUrl: window.location.href, // optional
            // failureUrl: window.location.href // optional
          });
          // Redirect happens, main useEffect handles state on reload.
        }
      } catch (e) {
        console.error(`Login failed for method ${method}:`, e);
        setError(e as Error);
        // Reset auth state
        setAuthMethod(null);
        setIsLoggedIn(false);
        setUserProfile(null);
        setNearAccountDetails(null);
      } finally {
        // For Web3Auth, isLoading might be set to false after its internal login resolves.
        // The main useEffect will also manage isLoading.
        // For NEAR, page reloads, so this isLoading state is lost.
        if (method === "web3auth") {
          // The main useEffect will set isLoading to false after processing.
        }
      }
    },
    [web3AuthLoginInternal, setAuthMethod],
  );

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (authMethod === "web3auth") {
        await web3AuthLogoutInternal();
      } else if (authMethod === "near") {
        near.signOut();
      }
    } catch (e) {
      console.error("Logout failed:", e);
      setError(e as Error);
    } finally {
      // Reset all auth state regardless of method or error during logout
      setAuthMethod(null);
      setIsLoggedIn(false);
      setUserProfile(null);
      setNearAccountDetails(null);
      setIsLoading(false);
    }
  }, [authMethod, web3AuthLogoutInternal]);

  // getIdToken function
  const getIdToken = useCallback(
    async (purposeMessage?: string): Promise<string | null> => {
      setError(null);
      if (!isLoggedIn) {
        console.warn("getIdToken called when not logged in.");
        return null;
      }
      try {
        if (authMethod === "web3auth" && web3AuthInstanceFromHook) {
          const authResult = await web3AuthInstanceFromHook.authenticateUser();
          return authResult.idToken;
        } else if (authMethod === "near" && nearAccountDetails?.accountId) {
          return nearAccountDetails?.accountId;
          return await sign({
            signer: near,
            recipient: "curatefun.near", // Replace if different
            message:
              purposeMessage ||
              `authentication for ${nearAccountDetails.accountId}`,
          });
        }
      } catch (e) {
        console.error("getIdToken failed:", e);
        setError(e as Error);
      }
      return null;
    },
    [
      isLoggedIn,
      authMethod,
      web3AuthInstanceFromHook,
      nearAccountDetails?.accountId,
    ],
  );

  const getWeb3AuthNearCredentials = useCallback(async (): Promise<{
    keyPair: KeyPair;
    publicKey: string;
  } | null> => {
    if (authMethod === "web3auth" && web3AuthProviderFromHook) {
      try {
        return await getWeb3AuthNearCredentialsInternal(
          web3AuthProviderFromHook,
        );
      } catch (e) {
        console.error("getWeb3AuthNearCredentials failed:", e);
        setError(e as Error);
        return null;
      }
    }
    return null;
  }, [
    authMethod,
    web3AuthProviderFromHook,
    getWeb3AuthNearCredentialsInternal,
  ]);


  useEffect(() => {
    if (isLoading || !isLoggedIn || userProfile) return;

    const autoCreateNearProfile = async () => {
      if (!nearAccountDetails?.accountId || !nearAccountDetails?.publicKey) {
        console.error("NEAR details not available for auto profile creation.");
        setError(new Error("NEAR details not available for auto profile creation."));
        return;
      }
      try {
        const username = nearAccountDetails.accountId.split(".")[0];
        console.log(`Attempting to auto-create NEAR profile for: ${username}`);

        const token = await getIdToken("create user profile (auto)");
        if (!token) {
          throw new Error("Failed to get auth token for auto profile creation");
        }

        await rawCreateUserProfile({
          username: username,
          near_public_key: nearAccountDetails.publicKey,
          idToken: token,
        });
        
        // Profile creation success, now fetch the newly created profile
        await fetchUserProfile();
      } catch (e) {
        console.error("Auto-creating NEAR profile failed:", e);
        setError(e as Error);
      }
      // No finally block needed to set isLoading, fetchUserProfile handles it.
    };

    if (authMethod === "near" && nearAccountDetails?.accountId && nearAccountDetails?.publicKey) {
      // For NEAR, attempt auto-creation if no profile exists (checked by the useEffect's initial guard)
      autoCreateNearProfile();
    } else if (authMethod === "web3auth" && nearAccountDetails?.accountId && nearAccountDetails?.publicKey) {
      // For Web3Auth, show modal if not already shown
      if (currentModal !== "create-account") {
        showCreateAccountModal();
      }
    }
    
    // If modal is open but conditions no longer met (e.g., profile created, user logged out)
    if (currentModal === "create-account" && (userProfile || !isLoggedIn)) {
      closeModal();
    }

  }, [
    isLoggedIn,
    userProfile,
    isLoading,
    authMethod,
    nearAccountDetails,
    showCreateAccountModal,
    closeModal,
    currentModal,
    fetchUserProfile,
    setError,
    getIdToken,
  ]);

  const contextValue: AuthContextType = {
    authMethod,
    isLoggedIn,
    isLoading,
    userProfile,
    nearAccountDetails,
    error,
    web3AuthInstance: web3AuthInstanceFromHook,
    web3AuthProvider: web3AuthProviderFromHook,
    login,
    logout,
    getIdToken,
    fetchUserProfile,
    getWeb3AuthNearCredentials,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
