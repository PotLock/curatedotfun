import { SubmissionData, SubmissionMetadata } from "../../services/db/types";
import { InboundPlugin } from "../../types/plugin";
import { TwitterService } from "./twitter.service";

export class TwitterInboundPlugin implements InboundPlugin {
  name = "twitter";
  private twitterService!: TwitterService; // '!' tells TypeScript this will be initialized

  constructor() { }

  async initialize(config: Record<string, string>): Promise<void> {
    this.twitterService = new TwitterService({
      username: config.username,
      password: config.password,
      email: config.email,
      twoFactorSecret: config.twoFactorSecret,
    });

    await this.twitterService.initialize();
  }

  generateSubmissionId(input: { tweetId: string; userId: string }): string {
    return `twitter_${input.userId}_${input.tweetId}`;
  }

  async getSubmission(input: { tweetId: string; curatorTweetId: string }): Promise<{
    data: SubmissionData;
    metadata: SubmissionMetadata;
  }> {
    const tweet = await this.twitterService.getTweet(input.tweetId);
    if (!tweet) {
      throw new Error(`Tweet not found: ${input.tweetId}`);
    }

    const curatorTweet = await this.twitterService.getTweet(input.curatorTweetId);
    if (!curatorTweet) {
      throw new Error(`Curator tweet not found: ${input.curatorTweetId}`);
    }

    return {
      data: {
        id: tweet.id,
        content: tweet.text || '',
        authorId: tweet.userId || '',
        authorUsername: tweet.username || '',
        createdAt: tweet.timeParsed?.toISOString() || new Date(tweet.timestamp || 0).toISOString(),
      },
      metadata: {
        type: "twitter_reply",
        platform: this.name,
        curatorId: curatorTweet.userId,
        curatorUsername: curatorTweet.username,
        curatorPostId: curatorTweet.id,
        submissionUrl: `https://twitter.com/${tweet.username}/status/${tweet.id}`,
      },
    };
  }

  validateSubmission(data: SubmissionData, metadata: SubmissionMetadata): boolean {
    if (metadata.type !== "twitter_reply") {
      return false;
    }

    return (
      typeof data.id === "string" &&
      typeof data.content === "string" &&
      typeof data.authorId === "string" &&
      typeof data.authorUsername === "string" &&
      typeof metadata.curatorId === "string" &&
      typeof metadata.curatorUsername === "string" &&
      typeof metadata.curatorPostId === "string"
    );
  }

  formatSubmission(data: SubmissionData, metadata: SubmissionMetadata) {
    return {
      content: data.content,
      curator: `@${metadata.curatorUsername}`,
      source: metadata.submissionUrl,
      timestamp: data.createdAt,
      author: `@${data.authorUsername}`,
      platform: "Twitter",
    };
  }

  async handleAcknowledgement(metadata: SubmissionMetadata): Promise<void> {
    await this.twitterService.likeTweet(metadata.curatorPostId);
    await this.twitterService.replyToTweet(metadata.curatorPostId, "Successfuly submitted!");
  }

  async shutdown(): Promise<void> {
    await this.twitterService.stop();
  }

  // Additional Twitter-specific methods that can be used by InboundService
  async checkNewMentions(): Promise<Array<{
    tweetId: string;
    curatorTweetId: string;
  }>> {
    const mentions = await this.twitterService.fetchAllNewMentions();
    return mentions.map(tweet => ({
      tweetId: tweet.inReplyToStatusId || tweet.id, // If it's a reply, get the original tweet
      curatorTweetId: tweet.id,
    }));
  }

  // Expose Twitter service methods that might be needed
  async setCookies(cookies: any[]) {
    return this.twitterService.setCookies(cookies);
  }

  getCookies() {
    return this.twitterService.getCookies();
  }

  async clearCookies() {
    return this.twitterService.clearCookies();
  }

  getLastCheckedTweetId() {
    return this.twitterService.getLastCheckedTweetId();
  }

  async setLastCheckedTweetId(tweetId: string) {
    return this.twitterService.setLastCheckedTweetId(tweetId);
  }
}
