import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../../../../components/ui/coming-soon";

export const Route = createFileRoute("/_layout/profile/settings/notifications")(
  {
    component: NotificationsComponent,
  },
);

function NotificationsComponent() {
  return (
    <ComingSoon
      title="Notification Settings"
      description="Stay in the loop with customizable notifications for your curated content and community activity."
      features={[
        "Email notifications for new submissions and approvals",
        "Push notifications for real-time updates",
        "Digest settings for weekly summaries",
        "Custom notification schedules",
        "Fine-grained notification categories",
      ]}
    />
  );
}
