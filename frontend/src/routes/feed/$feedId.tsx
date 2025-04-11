import { createFileRoute } from "@tanstack/react-router";
import FeedList from "../../components/FeedList";
import Layout from "../../components/Layout";
import { useState } from "react";
import { Submission } from "../../types/twitter";
import { useFeedConfig, useFeedItems } from "../../lib/api";
import { useBotId } from "../../lib/config";
import { getTwitterIntentUrl } from "../../lib/twitter";
import FeedHeader from "../../components/FeedHeader";
import SubmissionList from "../../components/SubmissionList";

export const Route = createFileRoute("/feed/$feedId")({
  component: FeedPage,
});

function FeedPage() {
  const { feedId } = Route.useParams();
  const { data: feed } = useFeedConfig(feedId);
  const { data: items = [] } = useFeedItems(feedId);
  const botId = useBotId();
  const [statusFilter, setStatusFilter] = useState<
    "all" | Submission["status"]
  >("all");

  const sidebarContent = (
    <div className="p-2">
      <FeedList selectedFeedId={feedId} />
    </div>
  );

  const rightPanelContent = feed && (
    <div className="space-y-8 max-w-full overflow-x-hidden">
      {/* Moderation Box */}
      <div className="p-1">
        <h3 className="text-2xl mb-4">Moderation</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Approvers</h4>
              <a
                href={getTwitterIntentUrl({ action: "apply", botId, feedId })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
              >
                apply
              </a>
            </div>
            <ul className="space-y-2">
              {feed.moderation.approvers.twitter.map((handle) => (
                <li key={handle}>
                  <a
                    href={`https://twitter.com/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-white border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-shadow duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-mono w-full"
                  >
                    <span className="bg-blue-400 text-white text-xs px-1.5 py-0.5 rounded mr-2">
                      Twitter
                    </span>
                    @{handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stream Box */}
      <div className="p-1">
        <h3 className="heading-3 mb-4">Stream</h3>
        <div className="space-y-4">
          <div className="p-4 bg-white border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-shadow duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5">
            <p className="text-center font-mono text-gray-500">
              Coming soon...
            </p>
          </div>
        </div>
      </div>

      {/* Recap Box */}
      <div className="p-1">
        <h3 className="heading-3 mb-4">Recap</h3>
        <div className="space-y-4">
          <div className="p-4 bg-white border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-shadow duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5">
            <p className="text-center font-mono text-gray-500">
              Coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout sidebar={sidebarContent} rightPanel={rightPanelContent}>
      <div className="space-y-4">
        <FeedHeader
          title={feed?.name || "Loading..."}
          description={feed?.description || "No description available"}
          items={items}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          feedName={feed?.name}
        />
        <SubmissionList
          items={items}
          statusFilter={statusFilter}
          botId={botId}
          feedId={feedId}
        />
      </div>
    </Layout>
  );
}

export default FeedPage;
