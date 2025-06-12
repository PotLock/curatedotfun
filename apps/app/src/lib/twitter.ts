export const getTweetUrl = (tweetId: string, username: string) => {
  return `https://x.com/${username}/status/${tweetId}`;
};