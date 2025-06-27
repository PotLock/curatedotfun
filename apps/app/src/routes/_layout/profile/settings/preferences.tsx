import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui/coming-soon";

export const Route = createFileRoute("/_layout/profile/settings/preferences")({
  component: PreferencesComponent,
});

function PreferencesComponent() {
  return (
    <ComingSoon
      title="Preferences Settings"
      description="Stay in the loop with customizable preferences for your curated content and community activity."
      features={[
        "Content preferences for personalized feeds",
        "Notification preferences for updates",
        "Privacy settings for your account",
        "Language and region settings",
        "Accessibility options",
      ]}
    />
  );
}
