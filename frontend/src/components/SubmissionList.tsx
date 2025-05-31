import { useBotId } from "../lib/config";
import { SubmissionWithFeedData } from "../types/twitter";
import FeedItem from "./FeedItem";

interface SubmissionListProps {
  items: SubmissionWithFeedData[];
  feedId?: string | undefined;
  /**
   * Layout style for the list of items
   * @default "flex" - Items will be displayed in a vertical flex container
   */
  layout?: "flex" | "grid";
}

const SubmissionList = ({
  items,
  feedId,
  layout = "flex",
}: SubmissionListProps) => {
  const botId = useBotId();

  if (items.length === 0) {
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
      {items.map((item) => (
        <FeedItem key={item.tweetId} submission={item} />
      ))}
    </div>
  );
};

export default SubmissionList;
