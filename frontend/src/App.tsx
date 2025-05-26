import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { UnifiedAuthProvider, useAuth } from "./contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCManager } from "./components/providers/TRPCManager";

import "@near-wallet-selector/modal-ui/styles.css";
import "./index.css";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnifiedAuthProvider>
        <TRPCManager queryClient={queryClient}>
          <RouterProvider router={router} context={{ auth: useAuth() }} />
        </TRPCManager>
      </UnifiedAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
