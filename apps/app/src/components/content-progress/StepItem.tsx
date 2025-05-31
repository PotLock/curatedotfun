import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";

interface StepItemProps {
  index: number;
  title: string;
  description: string;
  icon: ReactNode;
  content: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export function StepItem({
  index,
  title,
  description,
  icon,
  content,
  isOpen,
  onToggle,
}: StepItemProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden ${isOpen ? "bg-gray-50" : "bg-white"}`}
    >
      <div
        className="flex items-center justify-between p-[10px] cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className="p-2rounded-md">{icon}</div>
          <div>
            <h3 className="font-medium text-sm font-sans text-black leading-[14px]">
              Step {index + 1}: {title}
            </h3>
            <p className="text-sm text-[#525252] leadiong-5">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
        />
      </div>
      {isOpen && <div className="p-[10px] border-t">{content}</div>}
    </div>
  );
}
