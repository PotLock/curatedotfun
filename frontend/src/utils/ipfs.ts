export const IPFS_REGEX =
  /^(?:https?:\/\/)(?:[^\/]+\/ipfs\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})(?:\.[^\/]+)?(\/.*)?$/g;

export const replaceIpfsUrl = (imageUrl: string): string | null => {
  if (!imageUrl) return null;

  IPFS_REGEX.lastIndex = 0;
  const match = IPFS_REGEX.exec(imageUrl);
  if (match) {
    const newImageUrl = `https://ipfs.near.social/ipfs/${match[1]}${match[2] || ""}`;
    if (newImageUrl !== imageUrl) {
      return newImageUrl;
    }
  }
  return null;
};
