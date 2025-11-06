import { createFileRoute } from "@tanstack/react-router";
import { useCreateTestTweet } from "../../../lib/api";
import { useState } from "react";

export const Route = createFileRoute("/_layout/test/")({
  component: TestComponent,
});

function TestComponent() {
  const createTestTweetMutation = useCreateTestTweet();
  const [text, setText] = useState(
    "!submit @curatedotfun this is a test tweet from the app #test",
  );
  const [username, setUsername] = useState("user1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTestTweetMutation.mutate({
      text,
      username,
      hashtags: ["test"],
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Create Test Tweet</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium">
            Tweet Text
          </label>
          <input
            id="text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={createTestTweetMutation.isPending}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {createTestTweetMutation.isPending
            ? "Submitting..."
            : "Create Test Tweet"}
        </button>
      </form>
      {createTestTweetMutation.isSuccess && (
        <div className="mt-4 text-green-600">
          <p>Tweet created successfully!</p>
          <pre>{JSON.stringify(createTestTweetMutation.data, null, 2)}</pre>
        </div>
      )}
      {createTestTweetMutation.isError && (
        <div className="mt-4 text-red-600">
          Error: {createTestTweetMutation.error.message}
        </div>
      )}
    </div>
  );
}
