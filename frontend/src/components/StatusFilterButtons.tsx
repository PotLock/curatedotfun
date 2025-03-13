import { TwitterSubmission } from "../types/twitter";

interface StatusFilterButtonsProps {
  statusFilter: "all" | TwitterSubmission["status"];
  setStatusFilter: (status: "all" | TwitterSubmission["status"]) => void;
}

const StatusFilterButtons = ({
  statusFilter,
  setStatusFilter,
}: StatusFilterButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2 items-start xl:items-center xl:justify-end">
      <button
        onClick={() => setStatusFilter("all")}
        className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
          statusFilter === "all"
            ? "bg-black text-white"
            : "bg-gray-100 hover:bg-gray-200 text-black"
        }`}
      >
        All
      </button>
      <button
        onClick={() => setStatusFilter("pending")}
        className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
          statusFilter === "pending"
            ? "bg-yellow-200 text-black"
            : "bg-gray-100 hover:bg-gray-200 text-black"
        }`}
      >
        Pending
      </button>
      <button
        onClick={() => setStatusFilter("approved")}
        className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
          statusFilter === "approved"
            ? "bg-green-200 text-black"
            : "bg-gray-100 hover:bg-gray-200 text-black"
        }`}
      >
        Approved
      </button>
      <button
        onClick={() => setStatusFilter("rejected")}
        className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
          statusFilter === "rejected"
            ? "bg-red-200 text-black"
            : "bg-gray-100 hover:bg-gray-200 text-black"
        }`}
      >
        Rejected
      </button>
    </div>
  );
};

export default StatusFilterButtons;
