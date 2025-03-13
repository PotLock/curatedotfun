import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Redirect to the feed index page
    throw redirect({
      to: "/feed",
    });
  },
  component: Index,
});

function Index() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">No Feeds Available</h1>
      <p className="text-gray-600">
        Please configure at least one feed to get started.
      </p>
    </div>
  );
}
