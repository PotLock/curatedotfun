import { createFileRoute } from "@tanstack/react-router";
import { Card } from "../../../../components/ui/card";

export const Route = createFileRoute("/_layout/profile/settings/notifications")(
  {
    component: NotificationsComponent,
  },
);

function NotificationsComponent() {
  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Notification Settings</h2>
      <p>Manage your notification preferences here.</p>
      {/* Add notification settings form or options here */}
    </Card>
  );
}
