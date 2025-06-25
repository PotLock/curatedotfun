import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCreateFeed } from "@/lib/api";
import { useFeedCreationStore } from "@/store/feed-creation-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_layout/create/feed/review")({
  component: FeedReviewComponent,
});

function FeedReviewComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { feedConfig } = useFeedCreationStore();
  const createFeedMutation = useCreateFeed();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // @ts-expect-error needs to be fixed
      await createFeedMutation.mutateAsync(feedConfig);
      toast({
        title: "Feed Created Successfully!",
        description: `Your feed "${feedConfig.name}" has been created.`,
        variant: "default",
      });
      navigate({
        to: "/feed/$feedId",
        params: { feedId: feedConfig.id! },
      });
    } catch (error) {
      console.error("Error creating feed:", error);
      toast({
        title: "Error Creating Feed",
        description: "There was an error creating your feed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl text-neutral-500 font-normal">
          Review and Create
        </h2>
        <p className="text-sm text-[#64748B]">
          Review your feed settings and create your feed
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="p-6 rounded-md border-1 flex w-full border border-neutral-300 ">
          <div className="flex items-center gap-[40px] w-full">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
              {feedConfig.image ? (
                <img
                  src={feedConfig.image}
                  alt="Feed Profile"
                  className="h-[108px] w-[108px] object-cover"
                />
              ) : (
                <img
                  src="/images/feed-image.png"
                  alt="Feed Profile Placeholder"
                  className="h-[108px] w-[108px] object-cover"
                />
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2">
                <h3 className="text-xl font-semibold">
                  {feedConfig.name || "Untitled Feed"}
                </h3>
                <Badge className="p-1">
                  #{feedConfig.id || "No hashtag provided"}
                </Badge>
              </div>
              <p className="text-gray-700">
                {feedConfig.description || "No description provided"}
              </p>
              {/* Created at is not part of the new store */}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[24px]">
          <h3 className="text-2xl text-neutral-500 font-normal">Approvers</h3>
          {feedConfig.moderation?.approvers?.twitter &&
          feedConfig.moderation.approvers.twitter.length > 0 ? (
            <div className="space-y-2">
              {feedConfig.moderation.approvers.twitter.map((handle) => (
                <div
                  key={handle}
                  className="flex items-center justify-between py-3 px-4 border border-neutral-300 rounded-md "
                >
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {/* TODO: Get user name from handle */}
                      <span className="text-[#171717] font-normal">
                        {" "}
                        @{handle}
                      </span>
                    </span>
                    <div className="flex items-center text-xs text-[#171717]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M10.3494 1.75H12.1299L8.24098 6.22457L12.8327 12.2922H9.22492L6.41367 8.61412L3.18074 12.2922H1.40029L5.5703 7.51305L1.16602 1.75H4.86749L7.42104 5.12349L10.3494 1.75ZM9.71689 11.2145H10.7008L4.32867 2.75736H3.25102L9.71689 11.2145Z"
                          fill="#020617"
                        />
                      </svg>
                      <span className="text-sm">Twitter</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">No approvers added</p>
          )}
        </div>
        <div className="p-4 border rounded-md flex justify-start items-start gap-3 border-neutral-400 bg-neutral-50">
          <div className="text-base text-[#020617]">
            <p className="font-semibold">What Happens Next?</p>
            <div className="text-sm">
              <p>After creating your feed, you'll be able to:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Add content sources (Twitter, RSS feeds, etc.)</li>
                <li>Configure content generation templates</li>
                <li>Set up distribution channels.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/create/feed/settings" })}
          className="text-sm md:text-base"
        >
          Previous
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-sm md:text-base "
        >
          {isSubmitting ? "Submitting..." : "Create Feed"}
        </Button>
      </div>
    </div>
  );
}
