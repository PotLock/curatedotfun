import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  rightPanel?: ReactNode;
}

const Layout = ({ children, sidebar, rightPanel }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Feed List */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Center Panel - Feed Items */}
        <div className="flex-1 overflow-y-auto border-r border-gray-200 bg-white">
          <div className="p-6">
            {children}
          </div>
        </div>

        {/* Right Panel - Feed Details */}
        <div className="w-80 bg-white overflow-y-auto">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

export default Layout;
