import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NearWalletProvider } from "./components/providers/NearWalletProvider";

import "@near-wallet-selector/modal-ui/styles.css";
import "./index.css";

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

const queryClient = new QueryClient();

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NearWalletProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </NearWalletProvider>
    </QueryClientProvider>
  );
}

export default App;
