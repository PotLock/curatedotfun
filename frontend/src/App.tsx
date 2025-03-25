import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Web3AuthProvider } from "./contexts/web3auth";

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

function App() {
  return (
    <Web3AuthProvider>
      <RouterProvider router={router} />
    </Web3AuthProvider>
  );
}

export default App;
