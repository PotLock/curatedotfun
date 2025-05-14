import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import FeedList from "../../../components/FeedList";
import TopCurators from "../../../components/TopCurators";
import { Hero } from "../../../components/Hero";

export const Route = createFileRoute("/_layout/submissions/_layout")({
  component: SubmissionsLayoutRoute,
});

function SubmissionsLayoutRoute() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);

  // The title for the curators section
  const titleText = "Top Curators";

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  return (
    <>
      {/* <div className="flex flex-col gap-6 md:gap-12"> */}
      <Hero
        title="All Submissions."
        description="Interact with All submissions under one roof!"
      />
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
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
      />
      <div
        className={`fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">Feeds</h3>
          <button onClick={toggleMobileMenu} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <FeedList />
        </div>
      </div>
      {/* Mobile Curators Panel (Slide in from right) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 md:hidden ${
          mobileCuratorsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleCurators}
      />
      <div
        className={`fixed top-0 right-0 h-full w-3/4 max-w-xs bg-white z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${
          mobileCuratorsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-lg">{titleText}</h3>
          <button onClick={toggleCurators} aria-label="Close curators">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <h3 className="text-[32px] font-normal leading-[63px]">
                {titleText}
              </h3>
              <TopCurators />
            </div>
          </div>
        </div>
      </div>
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-4 md:max-w-[1440px] mx-auto gap-4 lg:gap-8 overflow-hidden px-4 lg:px-8">
        {/* Left Sidebar - Feed List (Desktop) */}
        <div className="col-span-1 overflow-y-auto">
          <FeedList />
        </div>

        {/* Main Content Area */}
        <div className="col-span-2">
          <div className="flex-1 overflow-y-auto h-full">
            <div>
              <Outlet />
            </div>
          </div>
        </div>

        {/* Right Panel - Feed Details */}
        <div className="col-span-1 bg-white overflow-y-auto">
          <div className="max-w-full overflow-x-hidden">
            <div>
              <h3 className="text-[32px] font-normal leading-[63px]">
                {titleText}
              </h3>
              <TopCurators />
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Content */}
      <div className="md:hidden px-4">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
      // {/* </div> */}
    </>
  );
}
