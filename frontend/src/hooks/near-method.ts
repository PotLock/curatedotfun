import { JsonRpcProvider } from "near-api-js/lib/providers";

interface RpcResponse {
  result: Uint8Array | Array<number>;
  block_height: number;
  block_hash: string;
}

interface TransactionOptions {
  gas?: string;
  deposit?: string;
  callbackUrl?: string;
}

interface FunctionCallAction {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: Record<string, unknown>;
    gas: string;
    deposit: string;
  };
}

interface Transaction {
  receiverId: string;
  callbackUrl?: string;
  actions: FunctionCallAction[];
}

const getRpcProvider = (): JsonRpcProvider => {
  const networkId = process.env.PUBLIC_NETWORK || "testnet";
  const rpcUrl =
    networkId === "mainnet"
      ? "https://rpc.mainnet.near.org"
      : "https://rpc.testnet.near.org";
  return new JsonRpcProvider({ url: rpcUrl });
};

export const ViewMethod = async <T = unknown>(
  contractId: string,
  method: string,
  args: Record<string, unknown>,
): Promise<T | null> => {
  try {
    const provider = getRpcProvider();

    const response = await provider.query<RpcResponse>({
      request_type: "call_function",
      account_id: contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "final",
    });

    if (!response?.result) {
      return null;
    }

    try {
      if (
        response.result instanceof Uint8Array ||
        Array.isArray(response.result)
      ) {
        return JSON.parse(Buffer.from(response.result).toString()) as T;
      }

      return response.result as unknown as T;
    } catch (parseError) {
      console.error("Error parsing response result:", parseError);
      return response.result as unknown as T;
    }
  } catch (error) {
    console.error("ViewMethod error:", error);
    throw error;
  }
};

export const CallMethod = async (
  accountId: string,
  selector: {
    wallet: () => Promise<{
      signAndSendTransaction: (transaction: Transaction) => Promise<unknown>;
    }>;
  },
  contractId: string,
  method: string,
  args: Record<string, unknown>,
  options?: TransactionOptions,
): Promise<unknown> => {
  try {
    if (!accountId) {
      throw new Error("Please connect wallet first");
    }

    const wallet = await selector.wallet();
    const transaction: Transaction = {
      receiverId: contractId,
      callbackUrl: options?.callbackUrl,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: method,
            args,
            gas: options?.gas || "30000000000000",
            deposit: options?.deposit || "0",
          },
        },
      ],
    };

    return await wallet.signAndSendTransaction(transaction);
  } catch (error) {
    console.error("CallMethod error:", error);
    throw error;
  }
};
