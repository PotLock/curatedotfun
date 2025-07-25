import type { FeedContextSubmission } from "@curatedotfun/types";
import { useAuth } from "../contexts/auth-context";
import { useSubmission } from "../lib/api";
import { useMemo } from "react";
import {
  useApproveSubmission,
  useRejectSubmission,
} from "../lib/api/moderation";
import { useCanModerateFeed } from "../lib/api/feeds";
import { getTweetUrl } from "../lib/twitter";
import { formatDate } from "../utils/datetime";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

export const UserLink = ({ username }: { username: string }) => (
  <a
    href={`https://x.com/${username}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-800 hover:text-gray-600 font-medium transition-colors"
  >
    @{username}
  </a>
);

const NotesSection = ({
  title,
  username,
  note,
  className = "",
}: {
  title: string;
  username: string;
  note?: string | null;
  className?: string;
}) => {
  // Change title based on whether there are notes or not
  const displayTitle = note
    ? title
    : title === "Moderation Notes"
      ? "Moderated"
      : "Curated";

  return (
    <div
      className={`p-4 border-2 border-gray-200 rounded-md bg-gray-50 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h4 className="heading-3">{displayTitle}</h4>
        <span className="text-gray-400">·</span>
        <div className="text-gray-600 break-words">
          by <UserLink username={username} />
        </div>
      </div>
      {note && <p className="body-text text-gray-700">{note}</p>}
    </div>
  );
};

const ModerationActions = ({
  submission,
  feedId,
}: {
  submission: FeedContextSubmission;
  feedId: string;
}) => {
  const approveMutation = useApproveSubmission(submission.tweetId);
  const rejectMutation = useRejectSubmission(submission.tweetId);

  const handleApprove = () => {
    if (!submission.tweetId || !feedId) {
      console.error(`Submission Tweet ID or Feed ID is missing for approval.`, {
        submission,
        feedId,
      });
      return;
    }
    approveMutation.mutate({
      submissionId: submission.tweetId,
      feedId: feedId,
    });
  };

  const handleReject = () => {
    if (!submission.tweetId || !feedId) {
      console.error(
        `Submission Tweet ID or Feed ID is missing for rejection.`,
        {
          submission,
          feedId,
        },
      );
      return;
    }
    rejectMutation.mutate({
      submissionId: submission.tweetId,
      feedId: feedId,
    });
  };

  return (
    <div className="flex justify-center flex-col gap-2">
      <Button
        onClick={handleApprove}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        {approveMutation.isPending ? "Approving..." : "Approve"}
      </Button>
      <Button
        onClick={handleReject}
        variant="destructive"
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        {rejectMutation.isPending ? "Rejecting..." : "Reject"}
      </Button>
    </div>
  );
};

interface FeedItemProps {
  submission: FeedContextSubmission;
  feedId?: string;
  allowModerationControls?: boolean;
}

// Function to truncate text to a specific character count without breaking words
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;

  // Find the last space before the maxLength
  const lastSpace = text.lastIndexOf(" ", maxLength);

  // If no space found, just cut at maxLength
  if (lastSpace === -1) return text.substring(0, maxLength) + "...";

  // Otherwise cut at the last space
  return text.substring(0, lastSpace) + "...";
};

export const FeedItem = ({
  submission: initialSubmission,
  feedId,
  allowModerationControls,
}: FeedItemProps) => {
  const auth = useAuth();
  const { data: submissionData, isLoading } = useSubmission(
    initialSubmission.tweetId,
  );

  const submission: FeedContextSubmission = useMemo(
    () => ({
      ...initialSubmission,
      ...(submissionData || {}),
      status: submissionData?.status ?? initialSubmission.status,
      moderationHistory:
        submissionData?.moderationHistory ??
        initialSubmission.moderationHistory ??
        [],
    }),
    [initialSubmission, submissionData],
  );

  const canModerateQuery = useCanModerateFeed(feedId);
  const lastModeration =
    submission.moderationHistory?.[submission.moderationHistory.length - 1];

  if (isLoading && !submissionData) {
    return (
      <div className="flex gap-3 flex-col p-4 w-full items-center justify-between border rounded-lg border-neutral-300 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mt-1"></div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 flex-col p-4 w-full items-center justify-between border rounded-lg border-neutral-300"
      id={submission.tweetId}
    >
      <div className="flex flex-col gap-3 w-full justify-between items-center">
        <div className="flex w-full justify-between items-center">
          <div className="flex md:flex-row flex-col items-center justify-center gap-2">
            <div>
              {/* <p className="text-[--card-foreground] text-nowrap text-base font-semibold leading-4">
                Web3Plug (murica/acc)
              </p> */}
              <UserLink username={submission.username} />
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="7"
                height="6"
                viewBox="0 0 7 6"
                fill="none"
              >
                <circle cx="3.28564" cy="3" r="3" fill="#D9D9D9" />
              </svg>
              <span className="text-gray-600 mt-1">
                {formatDate(submission.createdAt)}
              </span>
              {submission.tweetId && submission.username && (
                <a
                  href={getTweetUrl(submission.tweetId, submission.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div>
            <Badge variant={submission.status}>{submission.status}</Badge>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="w-full overflow-hidden">
        <p className="text-sm text-[#666]  leading-6 font-normal overflow-hidden text-ellipsis">
          {truncateText(submission.content, 240)}
        </p>
      </div>

      {/* Notes Section */}
      <div className="mt-6 w-full">
        {/* Moderation Notes */}
        {(submission.status === "approved" ||
          submission.status === "rejected") &&
          lastModeration && (
            <div className="flex">
              <div className="flex-col flex-grow">
                <NotesSection
                  title="Moderation Notes"
                  username={lastModeration.moderatorAccountId}
                  note={lastModeration.note}
                  // className="mb-4"
                />
              </div>
            </div>
          )}

        {/* Curator Notes and Moderation Actions for Pending Submissions */}
        {submission.status === "pending" && (
          <div className="flex items-center gap-8">
            {/* Curator's Notes */}
            <div className="flex-col flex-grow">
              <NotesSection
                title="Curator's Notes"
                username={submission.curatorUsername}
                note={submission.curatorNotes}
              />
            </div>

            {/* Moderation Actions Column */}
            <div className="flex-col">
              {allowModerationControls &&
              auth.isSignedIn &&
              feedId &&
              canModerateQuery.data?.canModerate ? (
                <ModerationActions submission={submission} feedId={feedId} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedItem;
