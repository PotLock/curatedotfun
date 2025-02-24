import { TwitterSubmission } from "types/twitter";
import { TransformerPlugin } from "../types/plugin";

export default class SimpleTransformer implements TransformerPlugin {
  name = "simple-transform";
  private format: string = "{CONTENT}"; // Default format if none provided

  async initialize(config: Record<string, string>): Promise<void> {
    if (config.format) {
      this.format = config.format;
    }
  }

  async transform(submission: TwitterSubmission): Promise<string> {
    try {
      let result = this.format;

      // Replace content placeholder
      result = result.replace("{CONTENT}", submission.content);
      result = result.replace("{CURATOR}", submission.curatorUsername);
      result = result.replace("{CURATOR_NOTES}", submission.curatorNotes || "");
      result = result.replace("{SUBMISSION_ID}", submission.tweetId || "");
      submission.username;

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Simple transformation failed: ${errorMessage}`);
    }
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }
}
