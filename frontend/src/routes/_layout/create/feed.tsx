import { createFileRoute } from "@tanstack/react-router";
import CurationFormSteps from "../../../components/CurationFormSteps";
import { Hero } from "../../../components/Hero";

export const Route = createFileRoute("/_layout/create/feed")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Hero
        title="Create your own autonomous brand."
        description="Set up your own feed on Twitter, Farcaster and other platforms with automated curation and distribution."
      />
      <CurationFormSteps />
    </div>
  );
}
