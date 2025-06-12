import { useApiQuery, useApiMutation } from "../../hooks/api-client";

export function useGetLastTweetId() {
  return useApiQuery<{ lastTweetId: string }>(
    ["last-tweet-id"],
    `/twitter/last-tweet-id`,
  );
}

interface UpdateTweetIdResponse { success: boolean; tweetId?: string; error?: string }
type UpdateTweetIdVariables = { tweetId: string };

export function useUpdateLastTweetId() {
  return useApiMutation<UpdateTweetIdResponse, Error, UpdateTweetIdVariables>(
    {
      method: 'POST',
      path: `/twitter/last-tweet-id`,
      message: "updateLastTweetId",
    },
    {
    }
  );
}
