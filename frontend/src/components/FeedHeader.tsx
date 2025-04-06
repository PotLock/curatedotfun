import StatusFilterButtons from "./StatusFilterButtons";
import DownloadButton from "./DownloadButton";
import { Submission, SubmissionWithFeedData } from "../types/twitter";

interface FeedHeaderProps {
  title: string;
  description: string;
  items: SubmissionWithFeedData[];
  statusFilter: "all" | Submission["status"];
  setStatusFilter: (status: "all" | Submission["status"]) => void;
  feedName?: string | undefined;
}

const FeedHeader = ({
  title,
  description,
  items,
  statusFilter,
  setStatusFilter,
  feedName,
}: FeedHeaderProps) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-sm sm:text-base text-gray-600">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2 items-start xl:items-center xl:justify-end">
        <div className="w-full sm:w-auto flex flex-wrap gap-2">
          <StatusFilterButtons
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <DownloadButton items={items} feedName={feedName} />
        </div>
      </div>
    </div>
  );
};

export default FeedHeader;
