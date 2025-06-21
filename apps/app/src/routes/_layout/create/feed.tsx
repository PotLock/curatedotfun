import {
  createFileRoute,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_layout/create/feed")({
  component: FeedLayoutComponent,
});

function FeedLayoutComponent() {
  const matchRoute = useMatchRoute();

  const steps = [
    { id: "/_layout/create/feed/", title: "Basic Information" },
    { id: "/_layout/create/feed/settings", title: "Curation Settings" },
    { id: "/_layout/create/feed/review", title: "Feed Review" },
  ];

  const currentStepIndex = steps.findIndex(
    (step) => matchRoute({ to: step.id })
  );
  const currentStep = currentStepIndex !== -1 ? currentStepIndex : 0;
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <div>
      <Hero
        title="Create your own autonomous brand."
        description="Set up your own feed on Twitter, Farcaster and other platforms with automated curation and distribution."
      />

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
                  className={`text-sm text-center ${
                    index === currentStep ? "font-bold" : ""
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border p-3 md:p-6 rounded-lg flex flex-col gap-4 md:gap-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
