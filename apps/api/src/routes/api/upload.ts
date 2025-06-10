import { Hono } from "hono";
import { PinataSDK } from "pinata-web3";

const IPFS_GATEWAY_URL = "potlock.mypinata.cloud";

export const sdk = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: IPFS_GATEWAY_URL,
});

const uploadRoutes = new Hono();

// Pinata Auth Key
uploadRoutes.get("/get-auth-key", async (c) => {
  try {
    const uuid = crypto.randomUUID();

    const keyData = await sdk.keys.create({
      keyName: uuid.toString(),
      maxUses: 1,
      permissions: { endpoints: { pinning: { pinFileToIPFS: true } } },
    });

    return c.json(keyData, 200);
  } catch (error) {
    console.error("Failed to create Pinata API key:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return c.json(
      { error: "Failed to create API key", details: errorMessage },
      500,
    );
  }
});

export { uploadRoutes };
