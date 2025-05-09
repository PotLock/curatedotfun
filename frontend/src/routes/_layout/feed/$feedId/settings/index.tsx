import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/feed/$feedId/settings/")({
  component: FeedSettingsPage,
});

function FeedSettingsPage() {
  const { feedId } = Route.useParams();

  return (
    <div className="space-y-[30px]">
      <div className="flex space-x-3">
        <Link
          to="/feed/$feedId/settings"
          params={{ feedId }}
          className="bg-[#F3F4F6] border-1 border border-neutral-300 hover:bg-neutral-200 px-4 py-2 rounded-md"
          activeProps={{
            className:
              "bg-black text-white border-1 border border-neutral-300 px-4 py-2 rounded-md",
          }}
        >
          General
        </Link>
        <Link
          to="/feed/$feedId/settings/connected"
          params={{ feedId }}
          className="bg-[#F3F4F6] border-1 border border-neutral-300 hover:bg-neutral-200 px-4 py-2 rounded-md"
          activeProps={{
            className:
              "bg-black text-white border-1 border border-neutral-300 px-4 py-2 rounded-md",
          }}
        >
          Connected Accounts
        </Link>
      </div>
      <Outlet />
    </div>
  );
}

export default FeedSettingsPage;
