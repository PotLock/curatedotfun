import { SubmissionWithFeedData } from "../types/twitter";

export const getTweetUrl = (tweetId: string, username: string) => {
  return `https://x.com/${username}/status/${tweetId}`;
};

type TwitterAction = "approve" | "reject" | "apply";

const isDev = () => process.env.NODE_ENV === "development";

const generateTweetId = () =>
  `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const handleApprove = async (
  submission: SubmissionWithFeedData,
  botId: string,
) => {
  if (isDev()) {
    const newTweetId = generateTweetId();
    const response = await fetch("/api/test/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newTweetId,
        text: `!approve @${botId}`,
        username: "test_admin",
        userId: "mock-user-id-test_admin",
        timeParsed: new Date(),
        inReplyToStatusId: submission.curatorTweetId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to submit approval tweet");
      return;
    }

    console.log("Development mode: Submitted approval tweet", { newTweetId });
    return;
  }

  // In production, open Twitter intent
  window.open(
    getTwitterIntentUrl({
      action: "approve",
      submission,
      botId,
    }),
    "_blank",
  );
};

export const handleReject = async (
  submission: SubmissionWithFeedData,
  botId: string,
) => {
  if (isDev()) {
    const newTweetId = generateTweetId();
    const response = await fetch("/api/test/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newTweetId,
        text: `!reject @${botId} spam`,
        username: "test_admin",
        userId: "test_admin_id",
        timeParsed: new Date(),
        inReplyToStatusId: submission.curatorTweetId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to submit rejection tweet");
      return;
    }

    console.log("Development mode: Submitted rejection tweet", { newTweetId });
    return;
  }

  // In production, open Twitter intent
  window.open(
    getTwitterIntentUrl({
      action: "reject",
      submission,
      botId,
    }),
    "_blank",
  );
};

export const getTwitterIntentUrl = (
  params: {
    action: TwitterAction;
    botId: string;
    feedId?: string;
  } & (
    | {
        action: "approve" | "reject";
        submission: SubmissionWithFeedData;
      }
    | { action: "apply"; submission?: never }
  ),
) => {
  const baseUrl = "https://twitter.com/intent/tweet";
  const urlParams = new URLSearchParams();

  if (params.action === "apply") {
    // Apply action tags the bot and includes feed hashtag
    urlParams.set(
      "text",
      `!apply @${params.botId} #${params.feedId} I want to be a curator because...`,
    );
  } else {
    // Approve/reject actions are replies to submissions
    urlParams.set("text", `!${params.action}`);
    urlParams.set("in_reply_to", params.submission.curatorTweetId);
  }

  return `${baseUrl}?${urlParams.toString()}`;
};
