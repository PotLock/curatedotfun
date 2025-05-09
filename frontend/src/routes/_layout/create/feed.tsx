import { createFileRoute } from "@tanstack/react-router";
import CreateFeedHero from "../../../components/CreateFeedHero";
import CurationFormSteps from "../../../components/CurationFormSteps";

export const Route = createFileRoute("/_layout/create/feed")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <CreateFeedHero />
      <CurationFormSteps />
    </div>
  );
}
