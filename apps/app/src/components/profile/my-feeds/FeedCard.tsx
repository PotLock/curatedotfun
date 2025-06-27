import type { FeedResponse } from "@curatedotfun/types";
import { useFeedStats } from "../../../lib/api/feeds";
import { Card } from "./card";

interface FeedCardProps {
  feed: FeedResponse;
}

export function FeedCard({ feed }: FeedCardProps) {
  const { contentCount, curatorCount } = useFeedStats(feed.id);

  const isComplete = !!(
    feed.config &&
    feed.config.name &&
    feed.config.description &&
    feed.config.sources &&
    feed.config.sources.length > 0
  );

  const tags: string[] = []; // TODO: Extract tags from feed sources or create a tags system
  const imageSrc = feed.config?.image || "/images/feed-image.png";

  return (
    <Card
      id={feed.id}
      image={imageSrc}
      title={feed.name}
      tags={tags}
      description={feed.description || "No description available"}
      createdAt={new Date(feed.createdAt)}
      curators={curatorCount}
      contents={contentCount}
      isCompleted={isComplete}
    />
  );
}
