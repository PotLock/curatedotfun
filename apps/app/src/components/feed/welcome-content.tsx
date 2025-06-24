import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useNavigate } from "@tanstack/react-router";
import { ScrollText, Sparkles } from "lucide-react";

interface FeedWelcomeContentProps {
  feedId: string;
}

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
    description: "Set up automated publishing to share your curated content.",
  },
];

export function FeedWelcomeContent({ feedId }: FeedWelcomeContentProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 sm:gap-[30px]">
      <div className="flex p-[35px] flex-col items-center justify-center gap-3.5 rounded border border-dashed border-neutral-500 bg-neutral-50">
        <div className="flex flex-col gap-3.5 items-center justify-center max-w-[445px] w-full text-center">
          <Sparkles size={32} />
          <p className="font-[Roboto] text-base font-medium">
            This Feed isn't set up yet
          </p>
          <p className="font-[Geist] text-sm font-medium">
            Your feed needs content generation to be configured before it can
            display content. Set up AI-powered content generation to
            automatically create and publish content.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6 items-center justify-center">
        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="flex-1 h-[1px] bg-[#D9D9D9] min-w-[20px]" />
          <p className="text-sm font-[Roboto] font-medium whitespace-nowrap px-2">
            WHAT'S NEXT ?
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
            navigate({ to: "/edit/feed/$feedId", params: { feedId } })
          }
        >
          Continue Feed Setup
        </Button>
      </div>
    </div>
  );
}

export default FeedWelcomeContent;
