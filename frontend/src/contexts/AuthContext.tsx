import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { CreateAccountModal } from "../components/CreateAccountModal";
import { useWeb3Auth } from "../hooks/use-web3-auth";
import { Web3AuthModalState } from "../types/web3auth";
import { Web3AuthProvider } from "./web3auth";

interface AuthContextType {
  modalState: Web3AuthModalState | null;
  setModalState: (state: Web3AuthModalState | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

function Web3AuthHandler() {
  const { isLoggedIn, currentUserProfile, nearPublicKey, isInitialized } =
    useWeb3Auth();
  const { setModalState } = useAuth();

  useEffect(() => {
    // Determine if the account creation modal should be shown
    if (isInitialized) {
      const shouldShowModal =
        isLoggedIn && // User must be logged in via Web3Auth
        !currentUserProfile && // Backend profile must NOT exist
        !!nearPublicKey; // NEAR public key must have been derived

      if (shouldShowModal) {
        setModalState({
          type: "create-account",
          isOpen: true,
          onClose: () => setModalState(null),
        });
      } else {
        setModalState(null);
      }
    }
  }, [
    isInitialized,
    isLoggedIn,
    currentUserProfile,
    nearPublicKey,
    setModalState,
  ]);

  return null;
}

function AuthModals() {
  const { modalState } = useAuth();

  if (!modalState) return null;

  switch (modalState.type) {
    case "create-account":
      return (
        <CreateAccountModal
          isOpen={modalState.isOpen}
          onClose={modalState.onClose}
        />
      );
    default:
      return null;
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [modalState, setModalState] = useState<Web3AuthModalState | null>(null);

  return (
    <AuthContext.Provider value={{ modalState, setModalState }}>
      <Web3AuthProvider>
        {children}
        <Web3AuthHandler />
        <AuthModals />
      </Web3AuthProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
