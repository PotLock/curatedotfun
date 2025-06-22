import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useFeed } from "../../../../lib/api";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "../../../../utils/datetime";
import { ScrollText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/feed/welcome/$feedId")({
  component: FeedWelcomePage,
});

function FeedWelcomePage() {
  const { feedId } = Route.useParams();
  const navigate = useNavigate();
  const { data: feed, isLoading, isError } = useFeed(feedId);

  const steps = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          width="24"
          height="24"
          viewBox="0 0 30 30"
        >
          <path d="M26.37,26l-8.795-12.822l0.015,0.012L25.52,4h-2.65l-6.46,7.48L11.28,4H4.33l8.211,11.971L12.54,15.97L3.88,26h2.65 l7.182-8.322L19.42,26H26.37z M10.23,6l12.34,18h-2.1L8.12,6H10.23z"></path>
        </svg>
      ),
      title: "Add Content Sources",
      description:
        "Connect Twitter, RSS feeds, or other sources to curate content from",
    },
    {
      icon: <Sparkles size={24} />,
      title: "Set Up Content Generation",
      description:
        "Configure AI to automatically generate content from your sources.",
    },
    {
      icon: <ScrollText size={24} />,
      title: "Set Up Content Publishing",
      description:
        "Configure AI to automatically generate content from your sources.",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading feed...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load feed</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      {/* Header with back button and feed title */}
      <div className="flex flex-col px-4 sm:px-6 md:px-[70px] py-4 sm:py-[30px] gap-4 sm:gap-[30px]">
        <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 rounded-md border border-neutral-400 bg-white">
          <div className="flex flex-col sm:flex-row sm:gap-[40px] gap-4 items-center sm:items-start w-full border-b border-1 border-dashed border-black pb-4">
            <img
              src={feed?.config.image || "/images/feed-image.png"}
              alt={feed?.config.name || "Feed image"}
              className="h-[80px] w-[80px] sm:h-[108px] sm:w-[108px] rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/feed-image.png";
              }}
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
              <p className="font-thin text-[15px] text-[#64748B]">
                Created{" "}
                {feed?.createdAt ? formatDate(feed.createdAt) : "Unknown"}
              </p>
            </div>
          </div>
          <div className="flex p-[35px] flex-col items-center justify-center gap-3.5 rounded border border-dashed border-neutral-500 bg-neutral-50">
            <div className="flex flex-col gap-3.5 items-center justify-center max-w-[445px] w-full text-center">
              <Sparkles size={32} />
              <p className="font-[Roboto] text-base font-medium">
                This Feed isn&apos;t set up yet
              </p>
              <p className="font-[Geist] text-sm font-medium">
                Your feed needs content generation to be configured before it
                can display content. Set up AI-powered content generation to
                automatically create and publish content.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6 items-center justify-center">
          <div className="flex items-center gap-2 w-full max-w-md">
            <div className="flex-1 h-[1px] bg-[#D9D9D9] min-w-[20px]" />
            <p className="text-sm font-[Roboto] font-medium whitespace-nowrap px-2">
              WHAT&apos;S NEXT ?
            </p>
            <div className="flex-1 h-[1px] bg-[#D9D9D9] min-w-[20px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="px-[15px] py-[21px] flex flex-col gap-0 rounded border-neutral-200 w-full md:max-w-[245px]"
              >
                {step.icon}
                <h4 className="mt-6 mb-4 font-[Roboto] text-base font-bold">
                  {step.title}
                </h4>
                <p className="font-[Geist] text-sm font-medium">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
          <Button
            onClick={() =>
              navigate({ to: "/feed/$feedId/settings", params: { feedId } })
            }
          >
            Continue Feed Setup
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FeedWelcomePage;
