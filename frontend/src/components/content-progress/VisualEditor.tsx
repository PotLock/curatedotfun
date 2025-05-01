import { Code } from "lucide-react";
import { Button } from "../ui/button";
import { TemplateElement } from "./TemplateElement";
import { templateElements } from "./data";
import { memo } from "react";

interface VisualEditorProps {
  selectedElements: string[];
  onElementToggle: (elementId: string) => void;
  onSwitchToJson: () => void;
}

export const VisualEditor = memo(function VisualEditor({
  selectedElements,
  onElementToggle,
  onSwitchToJson,
}: VisualEditorProps) {
  // Generate preview based on selected elements
  const generatePreview = () => {
    if (selectedElements.length === 0) {
      return "Select elements above to build your template";
    }

    return selectedElements
      .map((id) => templateElements.find((el) => el.id === id)?.template || "")
      .join("\n");
  };

  return (
    <div className="flex flex-col gap-[10px] items-center w-full">
      <div className="flex flex-col gap-4 items-start w-full">
        <div className="flex flex-col gap-1 items-start w-full">
          <p className="text-sm leading-5 text-black font-bold">
            Select Template Elements
          </p>
          <p className="text-xs leading-5 font-normal text-[#a3a3a3]">
            Choose which elements to include in your content template
          </p>
        </div>

        {/* Template Element Checkboxes */}
        <div className="flex flex-col gap-[10px] w-full">
          {templateElements.map((element) => (
            <TemplateElement
              key={element.id}
              element={element}
              isSelected={selectedElements.includes(element.id)}
              onToggle={onElementToggle}
            />
          ))}
        </div>

        {/* Preview Section */}
        <div className="w-full">
          <p className="text-sm font-bold mb-2">Preview</p>
          <div className="bg-neutral-100 border-neutral-300 border py-[6px] px-[14px] rounded-lg min-h-fit whitespace-pre-line font-mono text-sm">
            {generatePreview()}
          </div>
          <div className="flex items-end w-full justify-end mt-1">
            <Button variant={"ghost"} onClick={onSwitchToJson}>
              <Code className="h-4 w-4" />
              Edit Raw JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
