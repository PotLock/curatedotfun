// Contract addresses
export const SOCIAL_CONTRACT = {
  mainnet: "social.near",
  testnet: "v1.social08.testnet",
};

/**
 * Client for interacting with the NEAR Social contract
 */
export class NearSocialClient {
  /**
   * Set data on the NEAR Social contract
   * @param params Parameters for the set operation
   * @returns Transaction object with actions
   */
  static async set(params: {
    data: Record<string, any>;
    account: {
      publicKey: string;
      accountID: string;
    };
  }): Promise<{ actions: any[] }> {
    const { data, account } = params;

    // Create the transaction actions
    const actions = [
      {
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: { data },
          gas: "300000000000000",
          deposit: "0",
        },
      },
    ];

    return { actions };
  }
}
