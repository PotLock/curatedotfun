import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { Web3AuthProvider } from "./contexts/web3auth";
import { routeTree } from "./routeTree.gen";

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
      <Web3AuthProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </Web3AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
