import { create } from "zustand";

export type ModalType = "login" | "create-account" | null;

interface AuthState {
  // Current modal that should be shown
  currentModal: ModalType;

  // Actions to update the state
  showLoginModal: () => void;
  showCreateAccountModal: () => void;
  closeModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentModal: null,

  showLoginModal: () => set({ currentModal: "login" }),
  showCreateAccountModal: () => set({ currentModal: "create-account" }),
  closeModal: () => set({ currentModal: null }),
}));
