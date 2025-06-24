import { Tweet } from "agent-twitter-client";
import { TwitterCookie } from "./client";

export interface ITwitterService {
  initialize(): Promise<void>;
  stop(): Promise<void>;
  getUserIdByScreenName(screenName: string): Promise<string>;
  getTweet(tweetId: string): Promise<Tweet | null>;
  replyToTweet(tweetId: string, message: string): Promise<string | null>;
  likeTweet(tweetId: string): Promise<void>;
  fetchAllNewMentions(): Promise<Tweet[]>;
  setLastCheckedTweetId(tweetId: string): void;
  getLastCheckedTweetId(): string | null;
  setCookies(cookies: TwitterCookie[]): Promise<boolean>;
  getCookies(): Promise<TwitterCookie[] | null>;
}
