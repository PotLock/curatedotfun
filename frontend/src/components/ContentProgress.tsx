import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { stepDefinitions } from "./content-progress/data";
import { EmptyState } from "./content-progress/EmptyState";
import { StepItem } from "./content-progress/StepItem";
import { VisualEditor } from "./content-progress/VisualEditor";
import { JsonEditor } from "./content-progress/JsonEditor";
import { templateElements } from "./content-progress/data";

export default function ContentProgress() {
  const [showSteps, setShowSteps] = useState(false);
  const [openSteps, setOpenSteps] = useState<number[]>([0]); // Step 1 open by default
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("visual");
  const [jsonContent, setJsonContent] = useState<string>("");

  // Handle checkbox changes
  const handleElementToggle = (elementId: string) => {
    setSelectedElements((prev) => {
      if (prev.includes(elementId)) {
        return prev.filter((id) => id !== elementId);
      } else {
        return [...prev, elementId];
      }
    });
  };

  // Generate preview based on selected elements
  const generatePreview = () => {
    if (selectedElements.length === 0) {
      return "Select elements above to build your template";
    }

    return selectedElements
      .map((id) => templateElements.find((el) => el.id === id)?.template || "")
      .join("\n");
  };

  const handleButtonClick = () => {
    setShowSteps(true);
  };

  const toggleStep = (stepIndex: number) => {
    setOpenSteps((prev) =>
      prev.includes(stepIndex)
        ? prev.filter((index) => index !== stepIndex)
        : [...prev, stepIndex],
    );
  };

  // Function to switch to JSON editor with current preview content
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const switchToJsonEditor = () => {
    const previewContent = generatePreview();
    const jsonFormat = `{\n  "template": "${previewContent.replace(/\n/g, "\\n")}"\n}`;
    setJsonContent(jsonFormat);
    setActiveTab("json");
  };

  // Create steps with their content
  const steps = useMemo(
    () => [
      {
        ...stepDefinitions[0],
        content: (
          <Tabs
            defaultValue="visual"
            className="w-full mt-4"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="mb-4 w-full bg-[#F1F5F9]">
              <TabsTrigger
                value="visual"
                className="flex items-center gap-2 w-full bg-[#F1F5F9]"
              >
                Visual Editor
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="flex items-center gap-2 w-full"
              >
                JSON Editor
              </TabsTrigger>
            </TabsList>
            <TabsContent value="visual">
              <VisualEditor
                selectedElements={selectedElements}
                onElementToggle={handleElementToggle}
                onSwitchToJson={switchToJsonEditor}
              />
            </TabsContent>
            <TabsContent value="json">
              <JsonEditor
                jsonContent={jsonContent}
                onContentChange={setJsonContent}
              />
            </TabsContent>
          </Tabs>
        ),
      },
      {
        ...stepDefinitions[1],
        content: (
          <div className="py-4 px-2 text-gray-500">
            Advanced mapping configuration will go here
          </div>
        ),
      },
      {
        ...stepDefinitions[2],
        content: (
          <div className="py-4 px-2 text-gray-500">
            AI enhancement settings will go here
          </div>
        ),
      },
    ],
    [activeTab, jsonContent, selectedElements, switchToJsonEditor],
  );

  return (
    <div
      className={`${!showSteps ? "py-14 px-64 bg-gray-50" : "p-0 bg-white"}`}
    >
      {!showSteps ? (
        <EmptyState onAddFirstStep={handleButtonClick} />
      ) : (
        <div className="w-full space-y-4">
          {steps.map((step, index) => (
            <StepItem
              key={index}
              index={index}
              title={step.title}
              description={step.description}
              icon={<step.icon />}
              content={step.content}
              isOpen={openSteps.includes(index)}
              onToggle={() => toggleStep(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
