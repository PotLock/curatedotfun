import { ReactNode, useState } from "react";
import SubmissionsHero from "./SubmissionsHero";
import Header from "./Header";
import TopCurators from "./TopCurators";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  feedId?: string;
}

const SubmissionsLayout = ({ children, leftSidebar, feedId }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);

  // The title changes based on whether we're showing a specific feed
  const titleText =
    feedId && feedId !== "all" ? `Top Curators for #${feedId}` : "Top Curators";

  // Create a default right sidebar that will be used if none is provided
  const defaultRightSidebar = (
    <div className="max-w-full overflow-x-hidden">
      <div>
        <h3 className="text-[32px] font-normal leading-[63px] md:block hidden">
          {titleText}
        </h3>
        <TopCurators feedId={feedId} />
      </div>
    </div>
  );

  // Always use the default right sidebar
  const finalRightSidebar = defaultRightSidebar;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  return (
    <div className="flex flex-col gap-6 md:gap-12 bg-white min-h-screen">
      <div>
        <Header />
        <SubmissionsHero />
      </div>

      {/* Mobile Navigation Controls */}
      <div className="flex justify-between items-center px-4 md:hidden">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md flex bg-gray-100 hover:bg-gray-200"
          aria-label="Toggle feeds menu"
        >
          <Menu size={24} />
          <span className="ml-2 font-medium">Feeds</span>
        </button>

        <button
          onClick={toggleCurators}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
          aria-label="Toggle curators"
        >
          <span className="mr-2 font-medium">Curators</span>
        </button>
      </div>

      {/* Mobile Sidebar - Feed List (Slide in from left) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={toggleMobileMenu}
      />

      <div
        className={`fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">Feeds</h3>
          <button onClick={toggleMobileMenu} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">{leftSidebar}</div>
      </div>

      {/* Mobile Curators Panel (Slide in from right) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${mobileCuratorsOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={toggleCurators}
      />

      <div
        className={`fixed top-0 right-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${mobileCuratorsOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">{titleText}</h3>
          <button onClick={toggleCurators} aria-label="Close curators">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">{finalRightSidebar}</div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 lg:gap-8 overflow-hidden px-4 lg:px-8">
        {/* Left Sidebar - Feed List (Desktop) */}
        <div className="col-span-1 overflow-y-auto">{leftSidebar}</div>

        {/* Main Content Area */}
        <div className="col-span-2">
          <div className="flex-1 overflow-y-auto h-full">
            <div>{children}</div>
          </div>
        </div>

        {/* Right Panel - Feed Details */}
        <div className="col-span-1 bg-white overflow-y-auto">
          <div>{finalRightSidebar}</div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden px-4">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default SubmissionsLayout;
