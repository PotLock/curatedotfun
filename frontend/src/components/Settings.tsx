import { useState } from "react";
import {
  useAppConfig,
  useGetLastTweetId,
  useUpdateLastTweetId,
} from "../lib/api";
import RecapManager from "./RecapManager";

export default function Settings() {
  const { data: config } = useAppConfig();
  const { data: lastTweetData } = useGetLastTweetId();
  const updateTweetId = useUpdateLastTweetId();
  const [newTweetId, setNewTweetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      await updateTweetId.mutateAsync(newTweetId);
      setSuccess(true);
      setNewTweetId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update tweet ID",
      );
    }
  };

  return (
    <div className="p-8">
      <h1 className="heading-1 mb-8">Settings</h1>

      {/* Top Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Last Checked Tweet ID Section */}
        <div className="card">
          <h2 className="heading-2 mb-4">Last Checked Tweet ID</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-2">Current ID:</p>
              <code className="bg-gray-50 p-2 border-2 border-black block font-mono">
                {lastTweetData?.lastTweetId || "Not set"}
              </code>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="tweetId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Tweet ID
                </label>
                <input
                  type="text"
                  id="tweetId"
                  value={newTweetId}
                  onChange={(e) => setNewTweetId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
                  placeholder="Enter new tweet ID"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && (
                <div className="text-green-600 text-sm">
                  Successfully updated tweet ID!
                </div>
              )}

              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium w-full"
                disabled={updateTweetId.isPending}
              >
                {updateTweetId.isPending ? "Updating..." : "Update Tweet ID"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Global Plugins Section */}
      <div className="card mb-8">
        <h2 className="heading-2 mb-4">Global Plugins</h2>
        <div className="space-y-4">
          {config?.plugins &&
            Object.entries(config.plugins).map(([name, plugin]) => (
              <div key={name} className="card">
                <h3 className="heading-3 mb-2">{name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold">Type:</div>
                  <div>{plugin.type}</div>
                  <div className="font-semibold">URL:</div>
                  <div className="font-mono">{plugin.url}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Feeds Section */}
      <div className="card mb-8">
        <h2 className="heading-2 mb-4">Feed Configurations</h2>
        <div className="space-y-6">
          {config?.feeds.map((feed) => (
            <div key={feed.id} className="card">
              <h3 className="heading-3 mb-2">{feed.name}</h3>
              <p className="body-text mb-4">{feed.description}</p>

              {/* Approvers */}
              <div className="mb-4">
                <h4 className="heading-3 mb-2">Approvers:</h4>
                <div className="flex flex-wrap gap-2">
                  {feed.moderation.approvers.twitter.map((handle) => (
                    <span
                      key={handle}
                      className="bg-gray-100 px-2 py-1 rounded font-mono text-sm"
                    >
                      @{handle}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stream Plugins */}
              {feed.outputs.stream?.enabled &&
                feed.outputs.stream?.distribute && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Stream Plugins:</h4>
                    <div className="space-y-2">
                      {feed.outputs.stream?.distribute.map((dist, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded">
                          <code className="font-mono text-sm">
                            {dist.plugin}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Recap Manager */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <RecapManager feedId={feed.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
