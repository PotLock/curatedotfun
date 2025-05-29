import { Submission, SubmissionWithFeedData } from "../types/submission";
import FeedItem from "./FeedItem";

interface SubmissionListProps {
  items: SubmissionWithFeedData[];
  statusFilter: "all" | Submission["status"];
  botId: string | undefined;
  feedId?: string | undefined;
  /**
   * Layout style for the list of items
   * @default "flex" - Items will be displayed in a vertical flex container
   */
  layout?: "flex" | "grid";
}

const SubmissionList = ({
  items,
  statusFilter,
  botId,
  feedId,
  layout = "flex",
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

  // Render the list with appropriate layout
  return (
    <div
      className={
        layout === "grid"
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
          : "flex flex-col space-y-4"
      }
    >
      {filteredItems.map((item) => (
        <FeedItem
          key={item.tweetId}
          submission={item}
          statusFilter={statusFilter || "all"}
        />
      ))}
    </div>
  );
};

export default SubmissionList;
