import { useState } from "react";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

export default function ContentApprovers() {
  const [approvers, setApprovers] = useState([
    { id: 1, name: "Cuppy Cupperson", handle: "djcuppy" },
    { id: 2, name: "John Smith", handle: "jsmith" },
  ]);

  const handleDeleteApprover = (id: number) => {
    setApprovers(approvers.filter((approver) => approver.id !== id));
  };

  return (
    <div className="border border-gray-200 rounded-md p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-semibold leading-5">APPROVERS</p>
          <p className="text-sm font-normal text-gray-500">
            Generate Twitter threads from curated content
          </p>
        </div>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Plus size={16} />
          Add Approver
        </Button>
      </div>

      <div className="space-y-3 mt-6">
        {approvers.map((approver) => (
          <div
            key={approver.id}
            className="flex items-center justify-between py-3 px-4 border border-neutral-400 rounded-lg bg-neutral-50"
          >
            <div className="flex flex-col">
              <span className="font-bold">
                {approver.name}
                <span className="text-[#171717] font-normal">
                  {" "}
                  @{approver.handle}
                </span>
              </span>

              <div className="flex items-center  text-xs text-[#171717]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M10.3494 1.75H12.1299L8.24098 6.22457L12.8327 12.2922H9.22492L6.41367 8.61412L3.18074 12.2922H1.40029L5.5703 7.51305L1.16602 1.75H4.86749L7.42104 5.12349L10.3494 1.75ZM9.71689 11.2145H10.7008L4.32867 2.75736H3.25102L9.71689 11.2145Z"
                    fill="#020617"
                  />
                </svg>
                <span className="text-sm">Twitter</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="default"
              className="text-gray-400 hover:text-red-500"
              onClick={() => handleDeleteApprover(approver.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="25"
                viewBox="0 0 24 25"
                fill="none"
              >
                <path
                  d="M3 6.5H21M19 6.5V20.5C19 21.5 18 22.5 17 22.5H7C6 22.5 5 21.5 5 20.5V6.5M8 6.5V4.5C8 3.5 9 2.5 10 2.5H14C15 2.5 16 3.5 16 4.5V6.5M10 11.5V17.5M14 11.5V17.5"
                  stroke="#020617"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
