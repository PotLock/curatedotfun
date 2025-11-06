import { type KeyResponse, type PinResponse, PinataSDK } from "pinata-web3";

const IPFS_GATEWAY_URL = "potlock.mypinata.cloud";

export type FileUploadParams = {
  file: File;
};

export const upload = async ({
  file,
}: FileUploadParams): Promise<PinResponse> => {
  try {
    const authResponse = await fetch("/api/upload/get-auth-key");
    if (!authResponse.ok) {
      const errorBody = await authResponse.text();
      throw new Error(
        `Failed to retrieve Pinata auth key: ${authResponse.status} ${authResponse.statusText} - ${errorBody}`,
      );
    }

    const { JWT } = (await authResponse.json()) as KeyResponse;
    if (!JWT) {
      throw new Error("No JWT returned from Pinata auth key service");
    }

    const sdk = new PinataSDK({
      pinataJwt: JWT,
      pinataGateway: IPFS_GATEWAY_URL,
    });

    const pinResponse = await sdk.upload.file(file).key(JWT);
    return pinResponse;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during Pinata upload";
    console.error("Pinata upload failed:", error);
    throw new Error(`Pinata upload process failed: ${message}`);
  }
};

export const getImageUrl = (ipfsHash: string): string => {
  return `https://${IPFS_GATEWAY_URL}/ipfs/${ipfsHash}`;
};
