import ContentApprovers from "@/components/ContentApprovers";
import PublishingIntegrations from "@/components/PublishIntegrations";
import { Button } from "@/components/ui/button";
import { useFeedCreationStore } from "@/store/feed-creation-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";

const StepHeader = ({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) => (
  <div className="flex items-start flex-col gap-2 md:gap-3">
    <div className="flex gap-2 md:gap-3 items-center">
      <div className="flex-1 text-[#737373] text-sm md:text-base leading-6 font-londrina border border-neutral-500 rounded-md py-1 px-2 md:px-3 max-w-fit">
        {number}
      </div>
      <h2 className="text-xl md:text-2xl leading-7 font-medium font-londrina text-[#737373]">
        {title}
      </h2>
    </div>
    <p className="text-xs md:text-sm leading-5 md:leading-7 text-[#64748b]">
      {description}
    </p>
  </div>
);

type Step = {
  title: string;
  id: number;
  description: string;
  component: React.ReactNode;
};

const steps: Step[] = [
  {
    title: "Publishing Integrations",
    description: "Define how content is processed before being published",
    id: 1,
    component: <PublishingIntegrations />,
  },
  {
    title: "Content Approvers",
    description: "Set up approvers who will review content before publication",
    id: 2,
    component: <ContentApprovers />,
  },
];

export const Route = createFileRoute("/_layout/create/feed/settings")({
  component: CurationSettingsComponent,
});

function CurationSettingsComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { feedConfig } = useFeedCreationStore();
  const methods = useForm({
    defaultValues: feedConfig,
  });

  const handleNext = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      navigate({ to: "/create/feed/review" });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-4 md:gap-8">
        {steps.map((step) => (
          <div className="flex flex-col gap-3 md:gap-5" key={step.id}>
            <StepHeader
              number={step.id}
              title={step.title}
              description={step.description}
            />
            <div className="overflow-x-auto">{step.component}</div>
          </div>
        ))}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/create/feed",
              })
            }
            className="text-sm md:text-base"
          >
            Previous
          </Button>
          <Button onClick={handleNext} className="text-sm md:text-base">
            Next
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
