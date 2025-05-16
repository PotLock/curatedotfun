import React from "react";
import { useAuthStore } from "../store/auth-store";
import { LoginModal } from "./LoginModal";
import { CreateAccountModal } from "./CreateAccountModal";

export const AuthModals: React.FC = () => {
  const { currentModal, closeModal } = useAuthStore();

  return (
    <>
      <LoginModal isOpen={currentModal === "login"} onClose={closeModal} />

      <CreateAccountModal
        isOpen={currentModal === "create-account"}
        onClose={closeModal}
      />
    </>
  );
};
