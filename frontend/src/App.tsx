import { useState, useEffect } from "react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Web3AuthProvider } from "./contexts/web3auth";
import { useWeb3Auth } from "./hooks/use-web3-auth";
import { CreateNearAccountModal } from "./components/CreateNearAccountModal";
import "./index.css";

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Inner component to access Web3Auth context
function AppContent() {
  const { isLoggedIn, currentUserProfile, nearPublicKey, isInitialized } = useWeb3Auth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Determine if the modal should be shown
    const shouldShowModal =
      isInitialized && // Ensure context is ready
      isLoggedIn && // User must be logged in via Web3Auth
      !currentUserProfile && // Backend profile must NOT exist
      !!nearPublicKey; // NEAR public key must have been derived

    setIsModalOpen(shouldShowModal);

  }, [isInitialized, isLoggedIn, currentUserProfile, nearPublicKey]);

  return (
    <>
      <RouterProvider router={router} />
      <CreateNearAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)} // Allow closing the modal manually if needed, though success closes it too
      />
    </>
  );
}


function App() {
  return (
    <Web3AuthProvider>
      <AppContent /> {/* Render the inner component */}
    </Web3AuthProvider>
  );
}

export default App;
