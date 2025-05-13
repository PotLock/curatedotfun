import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "../components/Header";

export const Route = createFileRoute("/_layout")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex relative">
          {/* Center Panel - Feed Items */}
          <div className="flex-1 custom-scrollbar overflow-y-auto h-full">
            <div className=" pb-12 md:p-0 lg:p-0 md:pb-16 lg:pb-20">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
