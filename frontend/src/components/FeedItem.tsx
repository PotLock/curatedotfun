import { HiExternalLink } from "react-icons/hi";
import { TwitterSubmissionWithFeedData } from "@curatedotfun/types";

const getTweetUrl = (tweetId: string, username: string) => {
  return `https://x.com/${username}/status/${tweetId}`;
};

const getTwitterIntentUrl = (
  submission: TwitterSubmissionWithFeedData,
  action: "approve" | "reject",
) => {
  const baseUrl = "https://twitter.com/intent/tweet";
  const text = `@${submission.curatorUsername} !${action}`;
  const params = new URLSearchParams({
    text,
    in_reply_to: submission.curatorTweetId,
  });
  return `${baseUrl}?${params.toString()}`;
};

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
  clickable = false,
}: {
  status: TwitterSubmissionWithFeedData["status"];
  clickable?: boolean;
}) => {
  const baseClasses = "status-badge px-2 py-1 rounded-md text-sm font-medium";
  const statusClasses = {
    pending: "bg-yellow-200 text-black",
    approved: "bg-green-200 text-black",
    rejected: "bg-red-200 text-black",
  };
  const classes = `${baseClasses} ${statusClasses[status]} ${clickable ? "cursor-pointer hover:opacity-80" : ""}`;
  return <span className={classes}>{status}</span>;
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
}) => (
  <div
    className={`p-4 border-2 border-gray-200 rounded-md bg-gray-50 ${className}`}
  >
    <div className="flex items-center gap-2 mb-2">
      <h4 className="heading-3">{title}</h4>
      <span className="text-gray-400">·</span>
      <div className="text-gray-600">
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

const ModerationActions = ({
  submission,
}: {
  submission: TwitterSubmissionWithFeedData;
}) => (
  <div className="flex flex-col gap-2 mt-4">
    <a
      href={getTwitterIntentUrl(submission, "approve")}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-1.5 bg-green-200 hover:bg-green-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
    >
      approve
    </a>
    <a
      href={getTwitterIntentUrl(submission, "reject")}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-1.5 bg-red-200 hover:bg-red-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
    >
      reject
    </a>
  </div>
);

interface FeedItemProps {
  submission: TwitterSubmissionWithFeedData;
}

export const FeedItem = ({ submission }: FeedItemProps) => {
  const lastModeration =
    submission.moderationHistory?.[submission.moderationHistory.length - 1];

  return (
    <div className="card">
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
      </div>

      {/* Content Section */}
      <p className="text-lg leading-relaxed body-text pt-2">
        {submission.content}
      </p>

      {/* Notes Section */}
      <div className="mt-6">
        {/* Moderation Notes */}
        {(submission.status === "approved" ||
          submission.status === "rejected") &&
          lastModeration && (
            <NotesSection
              title="Moderation Notes"
              username={lastModeration.adminId}
              tweetId={submission.moderationResponseTweetId!}
              note={lastModeration.note}
              className="mb-4"
            />
          )}

        {/* Curator Notes */}
        {submission.status === "pending" && submission.curatorNotes?.trim() && (
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
