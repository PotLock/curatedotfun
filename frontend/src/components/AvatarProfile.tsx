import { useState, useEffect, useCallback } from "react";
import { NetworkIDEnum, Social } from "@builddao/near-social-js";
import { ViewMethod } from "../hooks/near-method";

// Constants
const DEFAULT_AVATAR =
  "https://ipfs.near.social/ipfs/bafkreibiyqabm3kl24gcb2oegb7pmwdi6wwrpui62iwb44l7uomnn3lhbi";
const IPFS_REGEX =
  /^(?:https?:\/\/)(?:[^\/]+\/ipfs\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})(?:\.[^\/]+)?(\/.*)?$/g;

interface NFTMetadata {
  base_uri?: string;
  [key: string]: any;
}

interface NFTToken {
  media?: string;
  reference?: string;
  metadata?: {
    media?: string;
  };
  [key: string]: any;
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
        IPFS_REGEX.lastIndex = 0;
        const match = IPFS_REGEX.exec(imageUrl);
        if (match) {
          const newImageUrl = `https://ipfs.near.social/ipfs/${match[1]}${match[2] || ""}`;
          if (newImageUrl !== imageUrl) {
            setOldUrl(imageUrl);
            setImageUrl(newImageUrl);
            return;
          }
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
        const nftMetadata = (await ViewMethod(
          contractId,
          "nft_metadata",
          {},
        )) as NFTMetadata;
        const tokenMetadata = (await ViewMethod(contractId, "nft_token", {
          token_id: tokenId,
        })) as NFTToken;

        if (!nftMetadata || !tokenMetadata) return null;

        let imageUrl = tokenMetadata.media || "";

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

      const social = new Social({
        contractId:
          process.env.PUBLIC_NETWORK === "mainnet"
            ? "social.near"
            : "v1.social08.testnet",
        network:
          process.env.PUBLIC_NETWORK === "mainnet"
            ? NetworkIDEnum.Mainnet
            : NetworkIDEnum.Testnet,
      });

      try {
        const result: any = await social.get({
          keys: [`${accountId}/profile/**`],
          useApiServer: process.env.PUBLIC_NETWORK === "mainnet",
        });

        const profileData = result?.[accountId]?.profile;
        const avatarUrl = profileData?.image?.ipfs_cid;
        const nftData = profileData?.image?.nft;

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
