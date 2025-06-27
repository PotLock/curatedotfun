import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute(
  "/_layout/profile/_tabs/settings/_tabs/preferences",
)({
  component: PreferencesComponent,
});

function PreferencesComponent() {
  return (
    <ComingSoon
      title="Preferences Settings"
      description="Customize your experience with personalized preferences for content, privacy, and accessibility settings."
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
