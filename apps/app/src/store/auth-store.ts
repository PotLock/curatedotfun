import { create } from "zustand";

export type ModalType = "login" | "create-account" | "wallet-login" | null;

interface AuthState {
  // Current modal that should be shown
  currentModal: ModalType;

  // Actions to update the state
  showLoginModal: () => void;
  showCreateAccountModal: () => void;
  showWalletLoginModal: () => void;
  closeModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentModal: null,

  showLoginModal: () => set({ currentModal: "login" }),
  showCreateAccountModal: () => set({ currentModal: "create-account" }),
  showWalletLoginModal: () => set({ currentModal: "wallet-login" }),
  closeModal: () => set({ currentModal: null }),
}));
