import { getErrorMessage } from "@crosspost/sdk";

export type SocialImage = {
  url?: string;
  ipfs_cid?: string;
};

export type Profile = {
  name?: string;
  description?: string;
  image?: SocialImage;
  backgroundImage?: SocialImage;
  linktree?: Record<string, string>;
};

export const API_SERVER = "https://api.near.social";

export const FALLBACK_URL =
  "https://ipfs.near.social/ipfs/bafkreidn5fb2oygegqaldx7ycdmhu4owcrmoxd7ekbzfmeakkobz2ja7qy";

export const getImageUrl = (
  image: SocialImage | undefined,
  fallback?: string,
): string => {
  if (image?.url) return image.url;
  if (image?.ipfs_cid) return `https://ipfs.near.social/ipfs/${image.ipfs_cid}`;
  return fallback || FALLBACK_URL;
};

export function getSocialLink(platform: string, username: string): string {
  const links: Record<string, string> = {
    github: `https://github.com/${username}`,
    telegram: `https://t.me/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
    twitter: `https://twitter.com/${username}`,
    website: `https://${username}`,
  };
  return links[platform] || "#";
}

/**
 * Upload a file or data URL to IPFS via NEAR Social
 * @param fileOrData The file to upload or a data URL/base64 string
 * @returns Promise resolving to the IPFS CID
 */
export async function uploadFileToIPFS(
  fileOrData: File | string,
): Promise<string> {
  try {
    const formData = new FormData();

    if (typeof fileOrData === "string") {
      // Handle data URL or base64 string
      // Convert data URL to blob
      let blob: Blob;

      if (fileOrData.startsWith("data:")) {
        // It's a data URL
        const response = await fetch(fileOrData);
        blob = await response.blob();
      } else {
        // Assume it's base64 data
        const byteString = atob(fileOrData.split(",")[1] || fileOrData);
        const mimeType =
          fileOrData.split(",")[0]?.split(":")[1]?.split(";")[0] ||
          "image/jpeg";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        blob = new Blob([ab], { type: mimeType });
      }

      // Create a File from the Blob
      const file = new File([blob], "image.jpg", { type: blob.type });
      formData.append("file", file);
    } else {
      // It's already a File object
      formData.append("file", fileOrData);
    }

    const response = await fetch("https://ipfs.near.social/add", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.cid;
  } catch (error) {
    console.error("Error uploading file to IPFS:", getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

export async function getProfile(accountId: string): Promise<Profile | null> {
  const keys = [`${accountId}/profile/**`];

  try {
    const response = await fetch(`${API_SERVER}/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keys,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[accountId] && data[accountId].profile) {
      return data[accountId].profile as Profile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching profile:", getErrorMessage(error));
    return null;
  }
}
