import ContentApprovers from "./ContentApprovers";
import ContentProgress from "./ContentProgress";
import PublishingIntegrations from "./PublishIntegrations";

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
    title: "Content Progress Configuration",
    description: "Define how content is processed before being published",
    id: 1,
    component: <ContentProgress />,
  },
  {
    title: "Publishing Integrations",
    description: "Define how content is processed before being published",

    id: 2,
    component: <PublishingIntegrations />,
  },
  {
    title: "Content Approvers",
    description: "Define how content is processed before being published",

    id: 3,
    component: <ContentApprovers />,
  },
  // {
  //   title: "Submission Rules",
  //   description: "Set requirements for content submissions to your feed",

  //   id: 4,
  //   component: <SubmissionRules />,
  // },
];

// Fixed function name (was CurationFormSteps)
export default function CurationSettingsForm() {
  return (
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
    </div>
  );
}
