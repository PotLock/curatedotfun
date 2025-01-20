import { createFileRoute } from "@tanstack/react-router";
import FeedItem from "../components/FeedItem";
import FeedList from "../components/FeedList";
import Layout from "../components/Layout";
import { useFeedConfig, useFeedItems } from "../lib/api";
import { useState } from "react";
import { TwitterSubmission } from "@curatedotfun/types";
import { useBotId } from "../lib/config";

export const Route = createFileRoute("/feed/$feedId")({
  component: FeedPage,
});

function FeedPage() {
  const { feedId } = Route.useParams();
  const { data: feed } = useFeedConfig(feedId);
  const { data: items = [] } = useFeedItems(feedId);
  const botId = useBotId();
  const [statusFilter, setStatusFilter] = useState<
    "all" | TwitterSubmission["status"]
  >("all");

  const filteredItems = items.filter(
    (item) => statusFilter === "all" || item.status === statusFilter,
  );

  const sidebarContent = (
    <div className="p-2">
      <FeedList />
    </div>
  );

  const rightPanelContent = feed && (
    <div className="space-y-8 max-w-full overflow-x-hidden">
      {/* Moderation Box */}
      <div className="p-1">
        <h3 className="text-2xl mb-4">Moderation</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Approvers</h4>
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
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 mr-4">
          <h2 className="text-2xl font-bold mb-2 sm:mb-0">
            {feed?.name || "Loading..."}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
                statusFilter === "all"
                  ? "bg-black text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-black"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
                statusFilter === "pending"
                  ? "bg-yellow-200 text-black"
                  : "bg-gray-100 hover:bg-gray-200 text-black"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
                statusFilter === "approved"
                  ? "bg-green-200 text-black"
                  : "bg-gray-100 hover:bg-gray-200 text-black"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium ${
                statusFilter === "rejected"
                  ? "bg-red-200 text-black"
                  : "bg-gray-100 hover:bg-gray-200 text-black"
              }`}
            >
              Rejected
            </button>
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="flex flex-col justify-center items-center p-8 space-y-2">
            <p className="text-gray-500">No items found</p>
            <p className="text-gray-400 text-sm">
              comment with "!submit @{botId} #{feed?.id}" to start curating
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <FeedItem key={item.tweetId} submission={item} />
          ))
        )}
      </div>
    </Layout>
  );
}
