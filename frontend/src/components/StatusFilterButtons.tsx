import { SubmissionStatus, Submission } from "../types/twitter";

interface StatusFilterButtonsProps {
  statusFilter: "all" | Submission["status"];
  setStatusFilter: (status: "all" | Submission["status"]) => void;
}

const StatusFilterButtons = ({
  statusFilter,
  setStatusFilter,
}: StatusFilterButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2 items-start xl:items-center xl:justify-end">
      {[
        { value: "all", label: "All", activeClass: "bg-black text-white" },
        {
          value: "pending",
          label: "Pending",
          activeClass: "bg-yellow-200 text-black",
        },
        {
          value: "approved",
          label: "Approved",
          activeClass: "bg-green-200 text-black",
        },
        {
          value: "rejected",
          label: "Rejected",
          activeClass: "bg-red-200 text-black",
        },
      ].map(({ value, label, activeClass }) => (
        <button
          key={value}
          onClick={() => setStatusFilter(value as SubmissionStatus)}
          className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
            statusFilter === value
              ? activeClass
              : "bg-gray-100 hover:bg-gray-200 text-black"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default StatusFilterButtons;
