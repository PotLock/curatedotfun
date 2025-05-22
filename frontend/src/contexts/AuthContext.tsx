import { ReactNode, useEffect } from "react";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { useAuthStore } from "../store/auth-store";
import { Web3AuthProvider } from "./web3auth";

interface AuthProviderProps {
  children: ReactNode;
}

function Web3AuthHandler() {
  const { isLoggedIn, currentUserProfile, nearPublicKey, isInitialized } =
    useWeb3Auth();
  const { showCreateAccountModal, closeModal } = useAuthStore();

  useEffect(() => {
    // Determine if the account creation modal should be shown
    if (isInitialized) {
      const shouldShowModal =
        isLoggedIn && // User must be logged in via Web3Auth
        !currentUserProfile && // Backend profile must NOT exist
        !!nearPublicKey; // NEAR public key must have been derived

      if (shouldShowModal) {
        showCreateAccountModal();
      } else {
        closeModal();
      }
    }
  }, [
    isInitialized,
    isLoggedIn,
    currentUserProfile,
    nearPublicKey,
    showCreateAccountModal,
    closeModal,
  ]);

  return null;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <Web3AuthProvider>
      {children}
      <Web3AuthHandler />
    </Web3AuthProvider>
  );
};
