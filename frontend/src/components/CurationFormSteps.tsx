import { useState } from "react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import BasicInformationForm from "./BasicInformationForm";
import CurationSettingsForm from "./CurationSettingsForm";

// Define step content types
type Step = {
  title: string;
  description: string;
  component: React.ReactNode;
};

export default function CurationFormSteps() {
  const [currentStep, setCurrentStep] = useState(0);

  // Define the steps
  const steps: Step[] = [
    {
      title: "Basic Information",
      description: "Enter the basic details for your feed",
      component: <BasicInformationForm />,
    },
    {
      title: "Curation Settings",
      description: "Configure how content is curated",
      component: <CurationSettingsForm />,
    },
    {
      title: "Feed Review",
      description: "Review your feed before publishing",
      component: <FeedReviewForm />,
    },
  ];

  // Calculate progress percentage
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-black">
          Step {currentStep + 1} of {steps.length}
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <span
                className={`text-sm ${index === currentStep ? "font-bold" : ""}`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className=" border p-6 rounded-lg flex flex-col gap-8">
        <div className="flex flex-col gap-1 w-full">
          <h2 className="text-2xl font-bold mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-sm text-[#64748B] mb-6">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Step form content */}
        <div className="">{steps[currentStep].component}</div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
    </div>
  );
}

function FeedReviewForm() {
  return <div>Feed Review Form Content</div>;
}
