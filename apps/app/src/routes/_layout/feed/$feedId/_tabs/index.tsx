import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs/")({
  beforeLoad: ({ params }) => {
    if (params.feedId) {
      throw redirect({
        to: "/feed/$feedId/curation",
        params: { feedId: params.feedId },
        replace: true,
      });
    }
    return {};
  },
  component: () => null,
});
