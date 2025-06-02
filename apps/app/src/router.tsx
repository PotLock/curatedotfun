import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanstackRouter } from "@tanstack/react-router";
// import { NearWalletProvider } from "./components/providers/NearWalletProvider";
// import { AuthProvider } from "./contexts/AuthContext";

import "@near-wallet-selector/modal-ui/styles.css";

import { routeTree } from "./routeTree.gen";

import './styles.css'

// Create a new router instance
export const createRouter = () => {
  const queryClient = new QueryClient();

  return createTanstackRouter({
    routeTree,
    context: {
      queryClient,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <p>not found</p>,

    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {props.children}
          {/* <NearWalletProvider> */}
            {/* <AuthProvider>{props.children}</AuthProvider> */}
          {/* </NearWalletProvider> */}
        </QueryClientProvider>
      );
    },
  });
};

// import { createRouter, RouterProvider } from "@tanstack/react-router";
// // import { routeTree } from "./routeTree.gen";
// import { AuthProvider } from "./contexts/AuthContext";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { NearWalletProvider } from "./components/providers/NearWalletProvider";
// import "./index.css";

// // Set up a Router instance
// const router = createRouter({
//   routeTree,
//   defaultPreload: "intent",
// });

// const queryClient = new QueryClient();

// // Register things for typesafety
// declare module "@tanstack/react-router" {
//   interface Register {
//     router: typeof router;
//   }
// }

// function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
// <NearWalletProvider>
//   <AuthProvider>
//     <RouterProvider router={router} />
//   </AuthProvider>
// </NearWalletProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
