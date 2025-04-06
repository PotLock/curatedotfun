import { HiExternalLink, HiChevronDown, HiChevronUp } from "react-icons/hi";
import {
  FeedStatus,
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../types/twitter";
import { getTweetUrl, handleApprove, handleReject } from "../lib/twitter";
import { useBotId } from "../lib/config";
import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Reusable Components
const UserLink = ({ username }: { username: string }) => (
  <a
    href={`https://x.com/${username}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-800 hover:text-gray-600 font-medium transition-colors"
  >
    @{username}
  </a>
);

const TweetLink = ({
  tweetId,
  username,
  title,
}: {
  tweetId: string;
  username: string;
  title: string;
}) => (
  <a
    href={getTweetUrl(tweetId, username)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-600 hover:text-gray-800 transition-colors"
    title={title}
  >
    <HiExternalLink className="inline h-4 w-4" />
  </a>
);

const StatusBadge = ({
  status,
  feedId,
  feedName,
  clickable = false,
}: {
  status: SubmissionWithFeedData["status"];
  feedId?: string;
  feedName?: string;
  clickable?: boolean;
}) => {
  const baseClasses = "status-badge px-2 py-1 rounded-md text-sm font-medium";
  const statusClasses = {
    pending: "bg-yellow-200 text-black",
    approved: "bg-green-200 text-black",
    rejected: "bg-red-200 text-black",
  };
  const classes = `${baseClasses} ${statusClasses[status]} ${clickable ? "cursor-pointer hover:opacity-80" : ""}`;

  if (feedId) {
    return (
      <Link
        to="/feed/$feedId"
        params={{ feedId }}
        className={classes}
        title={feedName}
      >
        {status}
      </Link>
    );
  }

  return <span className={classes}>{status}</span>;
};

// Feed Status Badges component
const FeedStatusBadges = ({
  feedStatuses,
  statusFilter,
}: {
  feedStatuses?: FeedStatus[];
  statusFilter: "all" | SubmissionStatus;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!feedStatuses || feedStatuses.length === 0) {
    return null;
  }

  // Filter statuses based on statusFilter
  const filteredStatuses =
    statusFilter === "all"
      ? feedStatuses
      : feedStatuses.filter((fs) => fs.status === statusFilter);

  if (filteredStatuses.length === 0) {
    return null;
  }

  // Show only 1 badge on mobile/tablet, up to 3 on desktop
  const maxVisibleBadges = {
    mobile: 1,
    desktop: 3,
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1">
        {/* Mobile view - show only 1 badge */}
        <div className="md:hidden">
          {filteredStatuses.slice(0, maxVisibleBadges.mobile).map((fs) => (
            <StatusBadge
              key={fs.feedId}
              status={fs.status}
              feedId={fs.feedId}
              feedName={fs.feedName}
              clickable
            />
          ))}

          {filteredStatuses.length > maxVisibleBadges.mobile && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 rounded-md text-sm font-medium bg-gray-200 text-black flex items-center"
            >
              +{filteredStatuses.length - maxVisibleBadges.mobile} more
              {isExpanded ? (
                <HiChevronUp className="ml-1" />
              ) : (
                <HiChevronDown className="ml-1" />
              )}
            </button>
          )}
        </div>

        {/* Desktop view - show up to 3 badges */}
        <div className="hidden md:flex md:flex-wrap md:gap-1">
          {filteredStatuses.slice(0, maxVisibleBadges.desktop).map((fs) => (
            <StatusBadge
              key={fs.feedId}
              status={fs.status}
              feedId={fs.feedId}
              feedName={fs.feedName}
              clickable
            />
          ))}

          {filteredStatuses.length > maxVisibleBadges.desktop && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 rounded-md text-sm font-medium bg-gray-200 text-black flex items-center"
            >
              +{filteredStatuses.length - maxVisibleBadges.desktop} more
              {isExpanded ? (
                <HiChevronUp className="ml-1" />
              ) : (
                <HiChevronDown className="ml-1" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Popover for expanded view */}
      {isExpanded && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-1 p-2 bg-white border-2 border-black shadow-sharp rounded-md z-10 min-w-[200px]"
        >
          <h4 className="font-medium mb-2">All Feeds</h4>
          <div className="space-y-2">
            {filteredStatuses.map((fs) => (
              <div
                key={fs.feedId}
                className="flex justify-between items-center"
              >
                <span className="text-sm">{fs.feedName}</span>
                <StatusBadge status={fs.status} feedId={fs.feedId} clickable />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const NotesSection = ({
  title,
  username,
  tweetId,
  note,
  className = "",
}: {
  title: string;
  username: string;
  tweetId: string;
  note: string | null;
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
          <span className="text-gray-400 mx-1">·</span>
          <TweetLink
            tweetId={tweetId}
            username={username}
            title={`View ${title.toLowerCase()} on X/Twitter`}
          />
        </div>
      </div>
      {note && <p className="body-text text-gray-700">{note}</p>}
    </div>
  );
};

const ModerationActions = ({
  submission,
}: {
  submission: SubmissionWithFeedData;
}) => {
  const botId = useBotId();

  return (
    <div className="flex flex-col gap-2 mt-4">
      <button
        onClick={() => handleApprove(submission, botId)}
        className="px-3 py-1.5 bg-green-200 hover:bg-green-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
      >
        approve
      </button>
      <button
        onClick={() => handleReject(submission, botId)}
        className="px-3 py-1.5 bg-red-200 hover:bg-red-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
      >
        reject
      </button>
    </div>
  );
};

interface FeedItemProps {
  submission: SubmissionWithFeedData;
  statusFilter: "all" | SubmissionStatus;
}

export const FeedItem = ({
  submission,
  statusFilter = "all",
}: FeedItemProps) => {
  const lastModeration =
    submission.moderationHistory?.[submission.moderationHistory.length - 1];

  return (
    <div className="card" id={submission.tweetId}>
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex flex-col pr-2">
            <div className="flex items-center gap-2">
              <span className="bg-blue-400 font-mono text-white text-xs px-1.5 py-0.5 rounded">
                Twitter
              </span>
              <span className="text-gray-400">·</span>
              <UserLink username={submission.username} />
              <TweetLink
                tweetId={submission.tweetId}
                username={submission.username}
                title="View original post on X/Twitter"
              />
            </div>
            <span className="text-gray-600 mt-1">
              {formatDate(submission.createdAt)}
            </span>
          </div>
        </div>

        {/* Show feed statuses if available, otherwise show the main status */}
        {submission.feedStatuses && submission.feedStatuses.length > 0 ? (
          <FeedStatusBadges
            feedStatuses={submission.feedStatuses}
            statusFilter={statusFilter as "all" | SubmissionStatus}
          />
        ) : (
          <a
            href={getTweetUrl(
              submission.curatorTweetId,
              submission.curatorUsername,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StatusBadge status={submission.status} clickable />
          </a>
        )}
      </div>

      {/* Content Section */}
      <div className="w-full overflow-hidden">
        <p className="text-lg leading-relaxed body-text pt-2 break-words overflow-wrap-anywhere">
          {submission.content}
        </p>
      </div>

      {/* Notes Section */}
      <div className="mt-6">
        {/* Moderation Notes */}
        {(submission.status === "approved" ||
          submission.status === "rejected") &&
          lastModeration && (
            <div className="flex">
              <div className="flex-col flex-grow">
                <NotesSection
                  title="Moderation Notes"
                  username={lastModeration.adminId}
                  tweetId={submission.moderationResponseTweetId!}
                  note={lastModeration.note}
                  className="mb-4"
                />
              </div>
            </div>
          )}

        {/* Curator Notes and Moderation Actions */}
        {submission.status === "pending" && (
          <div className="flex gap-8">
            <div className="flex-col flex-grow">
              <NotesSection
                title="Curator's Notes"
                username={submission.curatorUsername}
                tweetId={submission.curatorTweetId}
                note={submission.curatorNotes}
              />
            </div>
            <div className="flex-col">
              <div className="flex">
                <ModerationActions submission={submission} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedItem;
