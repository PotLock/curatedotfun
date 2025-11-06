import { near } from "../lib/near";
import { getProfile } from "../lib/near-social";
import { useCallback, useEffect, useState } from "react";
import { replaceIpfsUrl } from "../utils/ipfs";

// Constants
const DEFAULT_AVATAR =
  "https://ipfs.near.social/ipfs/bafkreibiyqabm3kl24gcb2oegb7pmwdi6wwrpui62iwb44l7uomnn3lhbi";

interface NFTMetadata {
  base_uri?: string;
  [key: string]: unknown;
}

interface NFTToken {
  media?: string;
  reference?: string;
  metadata?: {
    media?: string;
  };
  [key: string]: unknown;
}

type AvatarSize = "small" | "medium" | "large";

interface AvatarProfileProps {
  accountId: string;
  size?: AvatarSize;
  style?: string;
  image?: string;
}

const sizeMap: Record<AvatarSize, number> = {
  small: 24,
  medium: 32,
  large: 40,
};

export const AvatarProfile: React.FC<AvatarProfileProps> = ({
  accountId,
  size = "medium",
  style,
  image,
}) => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [oldUrl, setOldUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrl] = useState<string | null>(null);
  const [img, setImg] = useState<string | null>(null);

  const replaceIpfs = useCallback(
    (imageUrl: string) => {
      if (oldUrl !== imageUrl && imageUrl) {
        const newImageUrl = replaceIpfsUrl(imageUrl);
        if (newImageUrl) {
          setOldUrl(imageUrl);
          setImageUrl(newImageUrl);
          return;
        }
      }
      if (imageUrl !== null) {
        setImageUrl(null);
      }
    },
    [oldUrl],
  );

  const getThumbnailUrl = useCallback(
    (imageUrl: string) =>
      imageUrl && !imageUrl.startsWith("data:image/")
        ? `https://i.near.social/${imageUrl}`
        : imageUrl,
    [],
  );

  const fetchNFTMetadata = useCallback(
    async (contractId: string, tokenId: string) => {
      try {
        const nftMetadata: NFTMetadata = await near.view({
          contractId,
          methodName: "nft_metadata",
        });
        const tokenMetadata: NFTToken = await near.view({
          contractId,
          methodName: "nft_token",
          args: {
            token_id: tokenId,
          },
        });

        if (!nftMetadata || !tokenMetadata) return null;

        const imageUrl = tokenMetadata.media || "";

        if (imageUrl) {
          if (
            imageUrl.startsWith("https://") ||
            imageUrl.startsWith("http://") ||
            imageUrl.startsWith("data:image")
          ) {
            return imageUrl;
          }
          if (nftMetadata.base_uri) {
            return `${nftMetadata.base_uri}/${imageUrl}`;
          }
          if (imageUrl.startsWith("Qm") || imageUrl.startsWith("ba")) {
            return `https://ipfs.near.social/ipfs/${imageUrl}`;
          }
          return imageUrl;
        }

        if (tokenMetadata.reference) {
          const referenceUrl = await handleReferenceUrl(
            nftMetadata.base_uri,
            tokenMetadata.reference,
          );
          if (referenceUrl) return referenceUrl;
        }

        return null;
      } catch (error) {
        console.error("Error fetching NFT metadata:", error);
        return null;
      }
    },
    [],
  );

  const handleReferenceUrl = async (
    baseUri: string | undefined,
    reference: string,
  ) => {
    try {
      if (
        baseUri === "https://arweave.net" &&
        !reference.startsWith("https://")
      ) {
        const res = await fetch(`${baseUri}/${reference}`);
        const data = await res.json();
        return data.media;
      }
      if (reference.startsWith("https://") || reference.startsWith("http://")) {
        const res = await fetch(reference);
        const data = await res.json();
        return data.media;
      }
      if (reference.startsWith("ar://")) {
        const res = await fetch(
          `${"https://arweave.net"}/${reference.split("//")[1]}`,
        );
        const data = await res.json();
        return data.media;
      }
      return null;
    } catch (error) {
      console.error("Error handling reference URL:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!accountId) return;

      try {
        const profile = await getProfile(accountId);

        const avatarUrl = profile?.image?.ipfs_cid;
        const nftData = profile?.image?.nft;

        if (nftData) {
          const { contractId, tokenId } = nftData;
          const imageUrl = await fetchNFTMetadata(contractId, tokenId);
          if (imageUrl) {
            const src = imageUrls || imageUrl;
            setImg(src);
            setAvatar(getThumbnailUrl(src));
          }
        } else if (avatarUrl) {
          setAvatar(`https://ipfs.near.social/ipfs/${avatarUrl}`);
        }
      } catch (error) {
        console.error("Error fetching avatar:", error);
        setAvatar(DEFAULT_AVATAR);
      }
    };

    fetchAvatar();
  }, [accountId, fetchNFTMetadata, getThumbnailUrl, imageUrls]);

  const avatarSrc =
    avatar ||
    (image ? `https://ipfs.near.social/ipfs/${image}` : DEFAULT_AVATAR);
  const avatarSize = sizeMap[size];

  return (
    <div className="avatar-profile">
      <img
        src={avatarSrc}
        alt="User Avatar"
        width={avatarSize}
        height={avatarSize}
        style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
        className={`rounded-full object-cover ${style} ${image ? "border-[1px] border-aipgf-geyser border-solid shadow-sm" : ""}`}
        onError={() => replaceIpfs(img as string)}
      />
    </div>
  );
};
