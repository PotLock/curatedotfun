import { useState } from "react";
import { Submission, SubmissionWithFeedData } from "../types/twitter";
import { Modal } from "./Modal";

interface DownloadButtonProps {
  items: SubmissionWithFeedData[];
  feedName?: string | undefined;
}

const DownloadButton = ({ items, feedName = "all" }: DownloadButtonProps) => {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const handleDownload = (selectedStatus: "all" | Submission["status"]) => {
    const itemsToDownload = items.filter(
      (item) => selectedStatus === "all" || item.status === selectedStatus,
    );
    const jsonContent = JSON.stringify(itemsToDownload, null, 2);
    const file = new File(
      [jsonContent],
      `${feedName.toLowerCase()}_${selectedStatus}_submissions.json`,
      {
        type: "application/json;charset=utf-8",
      },
    );
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    try {
      a.href = url;
      a.download = `${feedName}_${selectedStatus}_submissions.json`;
      a.setAttribute("type", "application/json");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      URL.revokeObjectURL(url);
      setIsDownloadModalOpen(false);
    }
  };

  const DownloadModal = () => (
    <Modal
      isOpen={isDownloadModalOpen}
      onClose={() => setIsDownloadModalOpen(false)}
    >
      <h2 className="text-2xl font-bold mb-4">Download Submissions</h2>
      <p className="mb-4">Select which submissions you want to download:</p>
      <div className="space-y-2">
        <button
          onClick={() => handleDownload("all")}
          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 text-sm font-medium"
        >
          All Submissions
        </button>
        <button
          onClick={() => handleDownload("approved")}
          className="w-full px-4 py-2 bg-green-200 hover:bg-green-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 text-sm font-medium"
        >
          Approved Submissions
        </button>
        <button
          onClick={() => handleDownload("pending")}
          className="w-full px-4 py-2 bg-yellow-200 hover:bg-yellow-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 text-sm font-medium"
        >
          Pending Submissions
        </button>
        <button
          onClick={() => handleDownload("rejected")}
          className="w-full px-4 py-2 bg-red-200 hover:bg-red-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 text-sm font-medium"
        >
          Rejected Submissions
        </button>
      </div>
    </Modal>
  );

  return (
    <>
      <DownloadModal />
      <button
        onClick={() => setIsDownloadModalOpen(true)}
        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
      >
        Download
      </button>
    </>
  );
};

export default DownloadButton;
