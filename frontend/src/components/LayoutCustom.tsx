import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

const LayoutCustom = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex relative">
          {/* Center Panel - Feed Items */}
          <div className="flex-1 panel custom-scrollbar overflow-y-auto h-full">
            <div className="p-1 pb-12 md:p-4 lg:p-6 md:pb-16 lg:pb-20">
              {children}
            </div>
          </div>
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

export default LayoutCustom;
