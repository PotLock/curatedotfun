import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "@/components/Header";

export const Route = createFileRoute("/_layout")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen h-full bg-white">
      <Header />
      <main className="relative flex-1 pb-12 md:p-0 lg:p-0 md:pb-16 lg:pb-20">
        <Outlet />
      </main>
    </div>
  );
}
