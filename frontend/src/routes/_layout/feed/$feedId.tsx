import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Award,
  Coins,
  ListFilter,
  Newspaper,
  Settings2,
  UsersRound,
  Vote,
} from "lucide-react";
import FeedLayout from "../../../components/FeedLayout";
import { Badge } from "../../../components/ui/badge";
import { useFeed } from "../../../lib/api";

const TABS = [
  {
    to: "/feed/$feedId/",
    label: "Content",
    icon: Newspaper,
  },
  {
    to: "/feed/$feedId/curation",
    label: "Curation",
    icon: ListFilter,
  },
  {
    to: "/feed/$feedId/proposals",
    label: "Proposals",
    icon: Vote,
  },
  {
    to: "/feed/$feedId/token",
    label: "Token",
    icon: Coins,
  },
  {
    to: "/feed/$feedId/points",
    label: "Points",
    icon: Award,
  },
  {
    to: "/feed/$feedId/members",
    label: "Members",
    icon: UsersRound,
  },
  {
    to: "/feed/$feedId/settings",
    label: "Settings",
    icon: Settings2,
  },
];

export const Route = createFileRoute("/_layout/feed/$feedId")({
  component: FeedPageLayout,
});

function FeedPageLayout() {
  const { feedId } = Route.useParams();
  const { data: feed } = useFeed(feedId);

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      {/* Header with back button and feed title */}
      <div className="flex flex-col px-4 sm:px-6 md:px-[70px] py-4 sm:py-[30px] gap-4 sm:gap-[30px]">
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-md border border-neutral-400 bg-white">
          <div className="flex flex-col sm:flex-row sm:gap-[40px] gap-4 items-center sm:items-start w-full border-b border-1 border-dashed border-black pb-4">
            <img
              src="/images/feed-image.png"
              alt="Feed Image"
              className="h-[80px] w-[80px] sm:h-[108px] sm:w-[108px]"
            />
            <div className="flex flex-col gap-2 sm:gap-3 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:gap-[10px] gap-2 items-center">
                <h3 className="leading-8 sm:leading-10 text-xl sm:text-2xl font-[900]">
                  {feed?.name || `Feed: ${feedId}`}
                </h3>
                <Badge>#{feed?.id}</Badge>
              </div>
              <p className="text-sm sm:text-base leading-[20px] sm:leading-[22px] text-neutral-800">
                {feed?.description ||
                  "View and manage all content for this feed"}
              </p>
            </div>
          </div>
          <div className="flex sm:flex-row sm:items-center justify-between sm:justify-between w-full gap-2">
            <div className="flex  sm:flex-row items-center gap-2 w-full">
              <p>Curating from:</p>
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
                Twitter
              </Badge>
            </div>
            <div className="flex  sm:flex-row items-center gap-2 justify-end sm:gap-3 w-full sm:w-full">
              <p className="flex">Posting to:</p>
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
                Twitter
              </Badge>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="overflow-x-auto overflow-y-hidden max-w-[380px] md:max-w-full  border-b border-gray-200">
          <div className="flex space-x-1">
            {TABS.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                params={{ feedId }} // Pass feedId as param
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
                activeProps={{
                  className:
                    "flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-500 -mb-px",
                }}
              >
                <Icon strokeWidth={1} size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <FeedLayout feedId={feedId}>
          <Outlet />
        </FeedLayout>
      </div>
    </div>
  );
}

export default FeedPageLayout;
