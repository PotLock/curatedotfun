import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Layout from "../../components/Layout";

export const Route = createFileRoute("/_layout/test")({
  component: TestPage,
});

function TestPage() {
  const [selectedFeed, setSelectedFeed] = useState("test");
  const [submissionTweetId, setSubmissionTweetId] = useState<string | null>(
    null,
  );
  const [tweetText, setTweetText] = useState("");
  const [username, setUsername] = useState("curator");

  const prepareSubmit = () => {
    setTweetText(`@test_bot !submit #${selectedFeed}`);
    setUsername("curator");
  };

  const prepareApprove = () => {
    if (!submissionTweetId) {
      alert("Please submit content first");
      return;
    }
    setTweetText(`!approve @test_bot #${selectedFeed}`);
    setUsername("moderator");
  };

  const prepareReject = () => {
    if (!submissionTweetId) {
      alert("Please submit content first");
      return;
    }
    setTweetText(`!reject @test_bot #${selectedFeed} spam`);
    setUsername("moderator");
  };

  const generateTweetId = () => {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmitTweet = async () => {
    const newTweetId = generateTweetId();

    if (tweetText.includes("!submit")) {
      // Create original content tweet first
      const contentTweetId = generateTweetId();
      await fetch("/api/test/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contentTweetId,
          text: "Original content",
          username: "content_creator",
          userId: "content_creator_id",
          timeParsed: new Date(),
        }),
      });

      // Then create submission tweet
      const submissionResponse = await fetch("/api/test/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTweetId,
          text: tweetText,
          username,
          userId: `${username}_id`,
          timeParsed: new Date(),
          inReplyToStatusId: contentTweetId,
          hashtags: [selectedFeed],
        }),
      });

      const submissionTweet = await submissionResponse.json();
      setSubmissionTweetId(submissionTweet.id);
    } else {
      // For moderation tweets
      await fetch("/api/test/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTweetId,
          text: tweetText,
          username,
          userId: `${username}_id`,
          timeParsed: new Date(),
          inReplyToStatusId: submissionTweetId,
          hashtags: [selectedFeed],
        }),
      });
    }

    setTweetText("");
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="heading-1 mb-6">Test Control Panel</h1>

        {/* Feed Selection */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-4">Test Feed Selection</h2>
          <select
            value={selectedFeed}
            onChange={(e) => setSelectedFeed(e.target.value)}
            className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
          >
            <option value="test">Test Feed (Basic)</option>
            <option value="multi">Multi-Approver Test</option>
            <option value="edge">Edge Cases</option>
          </select>
        </div>

        {/* Quick Actions */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={prepareSubmit}
              className="px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
            >
              Submit
            </button>
            <button
              onClick={prepareApprove}
              className="px-3 py-1.5 bg-green-200 hover:bg-green-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
              disabled={!submissionTweetId}
            >
              Approve
            </button>
            <button
              onClick={prepareReject}
              className="px-3 py-1.5 bg-red-200 hover:bg-red-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
              disabled={!submissionTweetId}
            >
              Reject
            </button>
          </div>
        </div>

        {/* Tweet Preview */}
        <div className="card mb-6">
          <h2 className="heading-2 mb-4">Tweet Preview</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tweet Text
              </label>
              <textarea
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
                rows={3}
              />
            </div>
            <button
              onClick={handleSubmitTweet}
              disabled={!tweetText}
              className="px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
            >
              Submit Tweet
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
