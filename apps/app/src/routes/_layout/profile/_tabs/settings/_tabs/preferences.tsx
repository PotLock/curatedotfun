import { createFileRoute } from "@tanstack/react-router";
import { Card } from "../../../../../../components/ui/card";

export const Route = createFileRoute(
  "/_layout/profile/_tabs/settings/_tabs/preferences",
)({
  component: PreferencesComponent,
});

function PreferencesComponent() {
  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">User Preferences</h2>
      <p>Set your preferences for the application.</p>
      {/* Add user preferences form or options here */}
    </Card>
  );
}
