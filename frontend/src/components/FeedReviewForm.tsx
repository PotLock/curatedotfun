import { useFeedCreationStore } from "../store/feed-creation-store";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Info } from "lucide-react";

export default function FeedReviewForm() {
  const {
    profileImage,
    feedName,
    description,
    hashtags,
    createdAt,
    approvers,
    submissionRules,
  } = useFeedCreationStore();

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
        {/* Feed Basic Information */}
        <div className="p-6 rounded-md border-1 flex w-full border border-neutral-300 ">
          <div className="flex items-center gap-[40px] w-full">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
              {profileImage ? (
                <img
                  src={profileImage}
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
                  {feedName || "Untitled Feed"}
                </h3>
                <Badge className="p-1">
                  #{hashtags || "No hashtag provided"}
                </Badge>
              </div>
              <p className="text-gray-700">
                {description || "No description provided"}
              </p>
              {createdAt && (
                <p className="text-sm text-gray-500">
                  Created on {format(createdAt, "MMMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Approvers */}
        <div className="flex flex-col gap-[24px]">
          <h3 className="text-2xl text-neutral-500 font-normal">Approvers</h3>
          {approvers && approvers.length > 0 ? (
            <div className="space-y-2">
              {approvers.map((approver) => (
                <div
                  key={approver.id}
                  className="flex items-center justify-between py-3 px-4 border border-neutral-300 rounded-md "
                >
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {approver.name}
                      <span className="text-[#171717] font-normal">
                        {" "}
                        @{approver.handle}
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

        {/* Submission Rules */}
        {/* <div className="flex flex-col gap-[24px]">
          <h3 className="text-2xl text-neutral-500 font-normal">
            Submission Rules
          </h3>
          {submissionRules && (
            <div className="p-6 flex gap-2 border border-neutral-300 rounded-md justify-between">
              {submissionRules.minFollowersEnabled && (
                <div className="flex items-start gap-1 flex-col">
                  <h3 className="text-lg md:text-2xl text-neutral-500 font-normal">
                    {submissionRules.minFollowers}
                  </h3>
                  <span className="text-xs md:text-sm text-[#64748B]">
                    Minimum Followers
                  </span>
                </div>
              )}

              {submissionRules.minAccountAgeEnabled && (
                <div className="flex gap-1 flex-col">
                  <h3 className="text-lg md:text-2xl text-neutral-500 font-normal">
                    {submissionRules.minAccountAge} Months
                  </h3>
                  <span className="text-xs md:text-sm text-[#64748B]">
                    Minimum Account Age
                  </span>
                </div>
              )}

              <div className="flex gap-1 flex-col">
                <h3 className="text-lg md:text-2xl text-neutral-500 font-normal">
                  Blue Tick
                </h3>
                <span className="text-xs md:text-sm text-[#64748B]">
                  {submissionRules.blueTickVerified ? "Verified" : "No"}
                </span>
              </div>
            </div>
          )}
        </div> */}
        <div className="p-4 border rounded-md flex justify-start items-start gap-3 border-neutral-400 bg-neutral-50">
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  Set a minimum follower count requirement
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-base text-[#020617]">
            <p className="font-semibold">What Happens Next?</p>
            <div className="text-sm">
              <p>After creating your feed, you&apos;ll be able to:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Add content sources (Twitter, RSS feeds, etc.)</li>
                <li>Configure content generation templates</li>
                <li>Set up distribution channels.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
