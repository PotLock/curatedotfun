// import { ReactNode } from "react";
// import TopCurators from "./TopCurators";
// import { useParams } from "@tanstack/react-router";

// interface LayoutProps {
//   children: ReactNode;
//   feedId?: string;
// }

// const FeedLayout = ({ children, feedId }: LayoutProps) => {
//   //   const params = useParams();
//   const currentFeedId = feedId;

//   // Title text changes based on whether we have a specific feed or not
//   const titleText = currentFeedId ? `Top Curators` : "Top Curators";
//   return (
//     <div className="grid grid-cols-12 gap-6 w-full min-w-0 max-w-[1440px] mx-auto items-start">
//       <div className="col-span-9">{children}</div>
//       <div className="col-span-3">
//         <div>
//           <h3 className="leading-10 text-2xl font-normal">{titleText}</h3>
//           {/* Default content for right sidebar */}
//           <TopCurators feedId={currentFeedId} limit={5} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FeedLayout;

import { ReactNode, useState } from "react";
import TopCurators from "./TopCurators";
import { X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  feedId?: string;
}

const FeedLayout = ({ children, feedId }: LayoutProps) => {
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);
  const currentFeedId = feedId;

  // Title text changes based on whether we have a specific feed or not
  const titleText = currentFeedId
    ? `Top Curators for #${currentFeedId}`
    : "Top Curators";

  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  return (
    <>
      {/* Mobile Navigation Controls */}
      <div className="flex justify-end items-center mb-4 md:hidden">
        <button
          onClick={toggleCurators}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
          aria-label="Toggle curators"
        >
          <span className="font-medium">Top Curators</span>
        </button>
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
          <TopCurators feedId={currentFeedId} limit={5} />
        </div>
      </div>

      {/* Desktop and Mobile Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full min-w-0 max-w-[1440px] mx-auto items-start">
        {/* Main Content Area */}
        <div className="col-span-1 md:col-span-9">{children}</div>

        {/* Desktop Right Sidebar - Hidden on Mobile */}
        <div className="hidden md:block md:col-span-3">
          <div>
            <h3 className="leading-10 text-2xl font-normal">{titleText}</h3>
            <TopCurators feedId={currentFeedId} limit={5} />
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedLayout;
