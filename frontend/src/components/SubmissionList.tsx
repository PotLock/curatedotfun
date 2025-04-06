import { Submission, SubmissionWithFeedData } from "../types/twitter";
import FeedItem from "./FeedItem";

interface SubmissionListProps {
  items: SubmissionWithFeedData[];
  statusFilter: "all" | Submission["status"];
  botId: string | undefined;
  feedId?: string | undefined;
}

const SubmissionList = ({
  items,
  statusFilter,
  botId,
  feedId,
}: SubmissionListProps) => {
  // Filter items based on feed statuses if available
  const filteredItems = items.filter((item) => {
    // If no feed statuses, use the main status
    if (!item.feedStatuses || item.feedStatuses.length === 0) {
      return statusFilter === "all" || item.status === statusFilter;
    }

    // If feed statuses are available, check if any feed has the requested status
    if (statusFilter === "all") {
      return true; // Show all items when filter is "all"
    }

    // Check if any feed has the requested status
    return item.feedStatuses.some((fs) => fs.status === statusFilter);
  });

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 space-y-2">
        <p className="text-gray-500">No items found</p>
        <p className="text-gray-400 text-sm">
          comment with "!submit @{botId} #{feedId || "feedId"}" to start
          curating
        </p>
      </div>
    );
  }

  return (
    <>
      {filteredItems
        .sort(
          (a, b) =>
            new Date(b.submittedAt!).getTime() -
            new Date(a.submittedAt!).getTime(),
        )
        .map((item) => (
          <FeedItem
            key={item.tweetId}
            submission={item}
            statusFilter={statusFilter || "all"}
          />
        ))}
    </>
  );
};

export default SubmissionList;
