import { ReactNode, useState } from "react";
import Header from "./Header";
import { FaEllipsisV } from "react-icons/fa";

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  rightPanel?: ReactNode;
}

const Layout = ({ children, sidebar, rightPanel }: LayoutProps) => {
  const [showRightPanel, setShowRightPanel] = useState(false);
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      {/* Mobile Feeds List */}
      <div className="md:hidden overflow-x-auto whitespace-nowrap border-b-2 border-black">
        {sidebar}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Feed List (Desktop) */}
        <div className="hidden md:block w-64 panel custom-scrollbar overflow-y-auto">
          <div className="md:pb-16">{sidebar}</div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex relative">
          {/* Center Panel - Feed Items */}
          <div className="flex-1 panel custom-scrollbar overflow-y-auto h-full">
            <div className="p-1 pb-12 md:p-4 lg:p-6 md:pb-16 lg:pb-20">
              {/* Mobile Right Panel Toggle */}
              {rightPanel && (
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className="lg:hidden absolute top-2 right-2 p-2 text-xl"
                >
                  <FaEllipsisV />
                </button>
              )}
              {children}
            </div>
          </div>

          {/* Right Panel - Feed Details */}
          <div
            className={`${
              showRightPanel ? "translate-x-0" : "translate-x-full"
            } lg:translate-x-0 fixed lg:relative right-0 top-0 w-80 bg-white custom-scrollbar overflow-y-auto transition-transform duration-300 ease-in-out z-20 lg:z-0 border-l-2 border-black h-full panel`}
          >
            <div className="p-4 pb-20">
              {/* Mobile Close Button */}
              <button
                onClick={() => setShowRightPanel(false)}
                className="lg:hidden absolute top-2 right-2 p-2"
              >
                ✕
              </button>
              {rightPanel}
            </div>
          </div>

          {/* Mobile Overlay */}
          {showRightPanel && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
              onClick={() => setShowRightPanel(false)}
            />
          )}
        </div>
      </div>
      <footer className="fixed bottom-0 w-full py-2 sm:py-4 bg-white/80 backdrop-blur text-sm sm:text-base border-t-2 border-black">
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center sm:block sm:text-center">
            <a
              href="https://potlock.org"
              className="hover:text-gray-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"Curated with ❤️ by 🫕 POTLOCK"}
            </a>
            <a
              href="https://github.com/PotLock/curatedotfun/issues"
              className="sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2 px-4 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors rounded-md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
