import { createFileRoute } from "@tanstack/react-router";
import CurationFormSteps from "../../../components/CurationFormSteps";
import HeroComponent from "../../../components/HeroComponent";

export const Route = createFileRoute("/_layout/create/feed")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <HeroComponent
        title="Create your own autonomous brand."
        description="Set up your own feed on Twitter, Farcaster and other platforms with automated curation and distribution."
      />
      <CurationFormSteps />
    </div>
  );
}
