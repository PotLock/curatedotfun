import { Outlet, createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useState } from "react";
import { DistributorBadges } from "../../../components/DistributorBadges";
import { FeedWelcomeContent } from "../../../components/feed/welcome-content";
import TopCurators from "../../../components/feed/top-curators";
import { RecentContent } from "../../../components/feed/RecentContent";
import { Badge } from "../../../components/ui/badge";
import { useFeed } from "../../../lib/api";

export const Route = createFileRoute("/_layout/feed/$feedId")({
  component: FeedPageBaseLayout,
});

function FeedPageBaseLayout() {
  const { feedId } = Route.useParams();
  const { data: feed, isLoading, isError } = useFeed(feedId);
  const [mobileCuratorsOpen, setMobileCuratorsOpen] = useState(false);

  const toggleCurators = () => setMobileCuratorsOpen(!mobileCuratorsOpen);

  const titleText = feedId ? `Top Curators for #${feedId}` : "Top Curators";

  const isConfigured = feed && feed.config?.outputs?.stream?.enabled;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Loading feed data...
      </div>
    );
  }

  if (isError || !feed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Error loading feed information.
      </div>
    );
  }
  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="flex flex-col px-4 sm:px-6 md:px-[70px] py-4 sm:py-[30px] gap-4 sm:gap-[30px]">
        {/* Feed Header Section */}
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-md border border-neutral-400 bg-white">
          <div className="flex flex-col sm:flex-row sm:gap-[40px] gap-4 items-center sm:items-start w-full border-b border-1 border-dashed border-black pb-4">
            <img
              src={feed.config.image || "/images/feed-image.png"}
              alt={feed.config.name || "Feed image"}
              className="h-[80px] w-[80px] sm:h-[108px] sm:w-[108px] rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/feed-image.png";
              }}
            />
            <div className="flex flex-col gap-2 sm:gap-3 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:gap-[10px] gap-2 items-center">
                <h3 className="leading-8 sm:leading-10 text-xl sm:text-2xl font-[900]">
                  {feed.name || `Feed: ${feedId}`}
                </h3>
                <Badge>#{feed.id}</Badge>
              </div>
              <p className="text-sm sm:text-base leading-[20px] sm:leading-[22px] text-neutral-800">
                {feed.description ||
                  "View and manage all content for this feed"}
              </p>
            </div>
          </div>
          {isConfigured && (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <p className="text-sm sm:text-base">Curating from:</p>
                <div className="flex items-center gap-2 sm:mt-0">
                  <Badge className="flex gap-1 text-black border border-stone-500 rounded-md bg-stone-50 shadow-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M5.47681 2.1748L8.34204 5.96094L8.4729 6.13379L8.6145 5.9707L11.9094 2.1748H13.4788L9.28638 6.99902L9.1936 7.10645L9.27954 7.21973L14.3137 13.873H10.6301L7.46997 9.73828L7.34009 9.56836L7.19849 9.72949L3.55688 13.873H1.9856L6.49829 8.70117L6.59302 8.59375L6.5061 8.47949L1.68774 2.1748H5.47681ZM3.57642 3.25781L10.9661 12.9229L11.0188 12.9922H12.5813L12.3704 12.7109L5.08813 3.0459L5.0354 2.97559H3.36157L3.57642 3.25781Z"
                        stroke="#57534E"
                        strokeWidth="0.350493"
                      />
                    </svg>
                    Twitter{" "}
                    {/* TODO: Make this dynamic based on feed.config.inputs */}
                  </Badge>
                </div>
              </div>
              {(feed.config?.outputs?.stream?.distribute?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 justify-self-end sm:justify-self-auto">
                  <p className="text-sm sm:text-base text-right sm:text-left">
                    Posting to:
                  </p>
                  <div className="flex items-center gap-2 justify-end sm:justify-start">
                    <DistributorBadges
                      distribute={
                        feed.config?.outputs?.stream?.distribute ?? []
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area with Sidebar */}
        {/* Mobile Navigation Controls for Curators Sidebar */}
        {isConfigured ? (
          <>
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
                mobileCuratorsOpen
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
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
                <TopCurators feedId={feedId} limit={5} />
              </div>
            </div>

            {/* Desktop and Mobile Main Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full min-w-0">
              {/* Left Column: Outlet for Tabs */}
              <div className="col-span-1 md:col-span-9">
                <div className="mb-6">
                  <RecentContent
                    feedId={feedId}
                    feedName={feed.name || `Feed ${feedId}`}
                    feedImage={feed.config?.image}
                  />
                </div>
                <Outlet />
              </div>

              {/* Right Column: Desktop Top Curators Sidebar */}
              <div className="hidden md:block md:col-span-3">
                <div>
                  <h3 className="leading-10 text-2xl font-normal">
                    {titleText}
                  </h3>
                  <TopCurators feedId={feedId} limit={5} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <FeedWelcomeContent feedId={feedId} />
        )}
      </div>
    </div>
  );
}

export default FeedPageBaseLayout;
