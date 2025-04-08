import { useState } from "react";
import {
  Plus,
  ChevronDown,
  Code,
  Map,
  Sparkles,
  FileText,
  Edit3,
} from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

export default function ContentProgress() {
  const [showSteps, setShowSteps] = useState(false);
  const [openSteps, setOpenSteps] = useState<number[]>([0]); // Step 1 open by default

  const handleButtonClick = () => {
    setShowSteps(true);
  };

  const toggleStep = (stepIndex: number) => {
    if (openSteps.includes(stepIndex)) {
      setOpenSteps(openSteps.filter((index) => index !== stepIndex));
    } else {
      setOpenSteps([...openSteps, stepIndex]);
    }
  };

  const steps = [
    {
      title: "Basic Content Formatter",
      description:
        "Format and structure your content for consistent presentation",
      icon: <Code className="h-5 w-5" />,
      content: (
        <Tabs defaultValue="visual" className="w-full mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              JSON Editor
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <Textarea
              className="min-h-[200px] font-mono"
              placeholder="Edit your content visually here..."
            />
          </TabsContent>
          <TabsContent value="json">
            <Textarea className="min-h-[200px] font-mono" placeholder="{" />
          </TabsContent>
        </Tabs>
      ),
    },
    {
      title: "Advanced Content Mapper",
      description:
        "Map and transform content between different formats and structures",
      icon: <Map className="h-5 w-5" />,
      content: (
        <div className="py-4 px-2 text-gray-500">
          Advanced mapping configuration will go here
        </div>
      ),
    },
    {
      title: "AI Content Enhancer",
      description: "Use AI to automatically enhance and optimize your content",
      icon: <Sparkles className="h-5 w-5" />,
      content: (
        <div className="py-4 px-2 text-gray-500">
          AI enhancement settings will go here
        </div>
      ),
    },
  ];

  return (
    <div
      className={` ${!showSteps ? "py-14 px-64 bg-gray-50" : "p-0 bg-white"}`}
    >
      {!showSteps ? (
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
              onClick={handleButtonClick}
            >
              <Plus /> Add First Step
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="border rounded-lg bg-white overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer bg-gray-50"
                onClick={() => toggleStep(index)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-md">{step.icon}</div>
                  <div>
                    <h3 className="font-medium">
                      Step {index + 1}: {step.title}
                    </h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${openSteps.includes(index) ? "transform rotate-180" : ""}`}
                />
              </div>
              {openSteps.includes(index) && (
                <div className="p-4 border-t">{step.content}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
