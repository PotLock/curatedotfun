import { Checkbox } from "../ui/checkbox";
import { TemplateElement as TemplateElementType } from "./types";

interface TemplateElementProps {
  element: TemplateElementType;
  isSelected: boolean;
  onToggle: (elementId: string) => void;
}

export function TemplateElement({
  element,
  isSelected,
  onToggle,
}: TemplateElementProps) {
  return (
    <div className="flex items-start space-x-3 border rounded-lg p-[10px] bg-white hover:bg-gray-50">
      <Checkbox
        id={element.id}
        checked={isSelected}
        onCheckedChange={() => onToggle(element.id)}
        className="w-4 h-4 fill-black opacity-50"
      />
      <div className="self-stretch flex flex-col gap-1">
        <label
          htmlFor={element.id}
          className="text-sm font-medium leading-[14px] text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {element.title}
        </label>
        <p className="text-sm text-gray-500 mt-1">{element.description}</p>
      </div>
    </div>
  );
}
