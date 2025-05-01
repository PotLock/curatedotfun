import { Plus } from "lucide-react";
import { Button } from "../ui/button";

interface EmptyStateProps {
  onAddFirstStep: () => void;
}

export function EmptyState({ onAddFirstStep }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-6 md:py-8">
      <div className="flex flex-shrink-0 flex-col gap-2 md:gap-2 items-center px-4 md:px-0 max-w-[320px] md:max-w-none">
        <p className="text-[#a3a3a3] text-center text-sm md:text-base font-bold leading-6 md:leading-7">
          No Processing Steps Added
        </p>
        <p className="text-center text-xs md:text-base font-normal leading-5 md:leading-7 text-[#a3a3a3]">
          Processing steps transform your content before publishing
        </p>
        <Button
          variant={"secondary"}
          className="flex items-center bg-neutral-300 mt-2 text-sm md:text-base px-3 md:px-4"
          onClick={onAddFirstStep}
        >
          <Plus size={16} className="mr-1 md:mr-2" /> Add First Step
        </Button>
      </div>
    </div>
  );
}
