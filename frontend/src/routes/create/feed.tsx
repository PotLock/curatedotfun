import { createFileRoute } from "@tanstack/react-router";
import CreateFeedHero from "../../components/CreateFeedHero";
import Header from "../../components/Header";
import CurationFormSteps from "../../components/CurationFormSteps";

export const Route = createFileRoute("/create/feed")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Header />
      <CreateFeedHero />
      <CurationFormSteps />
    </div>
  );
}
