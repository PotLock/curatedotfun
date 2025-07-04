import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  image?: string;
  platform?: string;
  categories?: string[];
}

interface FeedCardProps {
  item: RssFeedItem;
  feedName: string;
  feedId: string;
  feedImage?: string;
}

export function FeedCard({ item, feedName, feedId, feedImage }: FeedCardProps) {
  const handleClick = () => {
    if (item.link) {
      window.open(item.link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col"
      onClick={handleClick}
    >
      <CardContent className="p-4 flex flex-col h-full">
        {/* Image */}
        {item.image && (
          <div className="mb-4">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-40 object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Content - flex-grow to push footer to bottom */}
        <div className="flex-grow flex flex-col">
          {/* Title */}
          <h4 className="font-semibold text-base line-clamp-3 mb-3 leading-tight">
            {item.title}
          </h4>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
              {item.description}
            </p>
          )}
        </div>

        {/* Footer Badge - always at bottom */}
        <div className="flex items-center gap-2 mt-auto">
          <img
            src={feedImage || "/images/feed-image.png"}
            alt={feedName}
            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/images/feed-image.png";
            }}
          />
          <Badge variant="secondary" className="text-xs truncate">
            {feedName}
          </Badge>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            #{feedId}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}