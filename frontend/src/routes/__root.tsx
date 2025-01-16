import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveUpdateProvider } from "../contexts/LiveUpdateContext";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <LiveUpdateProvider>
        <div>
          <nav className="bg-white border-b border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="hover:text-gray-600 transition-colors">
                <h1 className="text-xl font-bold">Curation Bot</h1>
              </Link>
              <Link
                to="/settings"
                className="text-sm hover:text-gray-600 font-medium transition-colors"
              >
                Settings
              </Link>
            </div>
          </nav>

          <Outlet />
        </div>
        </LiveUpdateProvider>
        <TanStackRouterDevtools position="bottom-right" />
      </QueryClientProvider>
    </>
  );
}
