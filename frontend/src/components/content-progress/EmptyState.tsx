import { Plus } from "lucide-react";
import { Button } from "../ui/button";

interface EmptyStateProps {
  onAddFirstStep: () => void;
}

export function EmptyState({ onAddFirstStep }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-shrink-0 flex-col gap-2 items-center">
        <p className="text-[#a3a3a3] text-center font-base font-bold leading-7">
          No Processing Steps Added
        </p>
        <p className="text-center text-base font-normal leading-7 text-[#a3a3a3]">
          Processing steps transform your content before publishing
        </p>
        <Button
          variant={"secondary"}
          className="flex items-center bg-neutral-300"
          onClick={onAddFirstStep}
        >
          <Plus /> Add First Step
        </Button>
      </div>
    </div>
  );
}
