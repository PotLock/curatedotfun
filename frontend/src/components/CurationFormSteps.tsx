import { useEffect, useState } from "react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import BasicInformationForm from "./BasicInformationForm";
import CurationSettingsForm from "./CurationSettingsForm";
import { AuthUserInfo } from "../types/web3auth";
import { useWeb3Auth } from "../hooks/use-web3-auth";

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

  const [userInfo, setUserInfo] = useState<Partial<AuthUserInfo>>();

  const { isInitialized, isLoggedIn, login, logout, getUserInfo } =
    useWeb3Auth();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        console.log("User Info:", info);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    if (isLoggedIn) {
      fetchUserInfo();
    } else {
      setUserInfo({});
    }
  }, [isLoggedIn, getUserInfo]);

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

          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1 || !isLoggedIn}
            className="text-sm md:text-base"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedReviewForm() {
  return <div>Feed Review Form Content</div>;
}
