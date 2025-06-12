import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "../hooks/use-toast";
import { useCreateFeed } from "../lib/api";
import { useFeedCreationStore } from "../store/feed-creation-store";
import BasicInformationForm from "./BasicInformationForm";
import CurationSettingsForm from "./CurationSettingsForm";
import FeedReviewForm from "./FeedReviewForm";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

// Define step content types
type Step = {
  title: string;
  description: string;
  component: React.ReactNode;
};

export default function CurationFormSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedData = useFeedCreationStore();
  const navigate = useNavigate();
  const createFeedMutation = useCreateFeed();

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
      // If moving from BasicInformationForm to the next step, set createdAt and show toast
      if (currentStep === 0) {
        feedData.setBasicInfo({ createdAt: new Date() });
        toast({
          title: "Information Saved",
          description: "Your feed information has been saved.",
          variant: "default",
        });
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="w-full md:max-w-4xl mx-auto py-4 md:py-8 px-4 md:px-0">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-black">
          Step {currentStep + 1} of {steps.length}
        </div>
        <Progress value={progressValue} />
        <div className="flex justify-between mb-6 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center min-w-[100px] px-2"
            >
              <span
                className={`text-sm text-center ${index === currentStep ? "font-bold" : ""}`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="border p-3 md:p-6 rounded-lg flex flex-col gap-4 md:gap-8">
        {currentStep === 0 && (
          <div className="flex flex-col gap-1 w-full">
            <h2 className="text-xl md:text-2xl font-bold mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-[#64748B] mb-3 md:mb-6">
              {steps[currentStep].description}
            </p>
          </div>
        )}

        {/* Step form content */}
        <div className="">{steps[currentStep].component}</div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="text-sm md:text-base"
          >
            Previous
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={async () => {
                setIsSubmitting(true);

                // Format the approvers data for the API
                const twitterHandles = feedData.approvers.map(
                  (approver) => approver.handle,
                );

                // Create the feed config object
                const feedConfig = {
                  id: feedData.hashtags.replace(/^#/, ""), // Remove # if present
                  name: feedData.feedName,
                  description: feedData.description,
                  enabled: true,
                  moderation: {
                    approvers: {
                      twitter: twitterHandles,
                    },
                  },
                  outputs: {
                    stream: {
                      enabled: true,
                    },
                  },
                };

                console.log("Feed config to submit:", feedConfig);

                // Call the API
                try {
                  await createFeedMutation.mutateAsync(feedConfig);
                  toast({
                    title: "Feed Created Successfully!",
                    description: `Your feed "${feedData.feedName}" has been created.`,
                    variant: "default",
                  });
                  navigate({ to: "/" });
                } catch (error) {
                  console.error("Error creating feed:", error);
                  toast({
                    title: "Error Creating Feed",
                    description:
                      "There was an error creating your feed. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="text-sm md:text-base "
            >
              {isSubmitting ? "Submitting..." : "Create Feed"}
            </Button>
          ) : (
            <Button onClick={handleNext} className="text-sm md:text-base">
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
