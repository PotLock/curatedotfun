import { Social, transformActions } from "@builddao/near-social-js";
import { getErrorMessage, isPlatformError } from "@crosspost/sdk";
import {
  ConnectedAccount,
  Platform,
  PlatformName,
  PostContent,
} from "@crosspost/types";
import { NETWORK_ID } from "../config";
import { SOCIAL_CONTRACT } from "./near-social";
import { getImageUrl, getProfile } from "./social";

export class NearSocialService {
  private wallet: any;

  constructor(wallet: any) {
    this.wallet = wallet;
  }

  /**
   * Get the current NEAR account profile
   * @returns Promise resolving to the platform account or null if not connected
   */
  async getCurrentAccountProfile(): Promise<ConnectedAccount | null> {
    if (!this.wallet) return null;

    try {
      const accounts = await this.wallet.getAccounts();
      if (!accounts || accounts.length === 0) return null;

      const accountId = accounts[0].accountId;
      const profile = await getProfile(accountId);

      // Get profile image URL or use a fallback
      const profileImageUrl = profile?.image ? getImageUrl(profile.image) : "";

      return {
        platform: "Near Social" as PlatformName,
        userId: accountId,
        connectedAt: "",
        profile: {
          userId: accountId,
          username: profile?.name || accountId,
          profileImageUrl,
          platform: "Near Social" as Platform,
          lastUpdated: Date.now(),
        },
      };
    } catch (error) {
      console.error(
        "Error getting NEAR account profile:",
        getErrorMessage(error),
      );
      return null;
    }
  }

  /**
   * Create a post on NEAR Social
   * @param posts Array of post content objects
   * @returns Promise resolving to the transaction object
   */
  async createPost(
    posts: PostContent[],
  ): Promise<{ contractId: string; actions: any[] } | null> {
    if (!this.wallet) throw new Error("Wallet not connected");

    try {
      const accounts = await this.wallet.getAccounts();
      if (!accounts || accounts.length === 0) return null;

      const { publicKey, accountId } = accounts[0];

      // Combine all posts into a single content, joining with newlines
      const combinedText = posts.map((p) => p.text).join("\n\n");

      const content = {
        type: "md",
        text: combinedText,
      };

      const nearSocialClient = new Social({
        contractId: SOCIAL_CONTRACT[NETWORK_ID],
        network: NETWORK_ID,
      });

      const transaction = await nearSocialClient.set({
        data: {
          [accountId]: {
            post: {
              main: JSON.stringify(content),
            },
            index: {
              post: JSON.stringify({
                key: "main",
                value: {
                  type: content.type,
                },
              }),
            },
          },
        },
        account: {
          // this is used to validate that the user has permission to post
          publicKey: publicKey,
          accountID: accountId,
        },
      });

      const transformedActions = transformActions(transaction.actions);

      return {
        contractId: SOCIAL_CONTRACT[NETWORK_ID],
        actions: transformedActions,
      };
    } catch (error) {
      console.error("Error creating post:", getErrorMessage(error));

      if (isPlatformError(error)) {
        throw error;
      }

      throw new Error(getErrorMessage(error));
    }
  }
}
