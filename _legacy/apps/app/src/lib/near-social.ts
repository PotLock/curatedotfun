export const API_SERVER = "https://api.near.social";

export type Profile = {
  name?: string;
  description?: string;
  image?: SocialImage;
  backgroundImage?: SocialImage;
  linktree?: Record<string, string>;
};

export type SocialImage = {
  url?: string;
  ipfs_cid?: string;
  nft?: {
    contractId: string;
    tokenId: string;
  };
};

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
    console.error("Error fetching profile:", error);
    return null;
  }
}

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
