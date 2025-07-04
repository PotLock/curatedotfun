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

interface RssFeedItemProps {
  item: RssFeedItem;
  onCategoryClick: (category: string) => void;
}

export function RssFeedItem({ item, onCategoryClick }: RssFeedItemProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {item.image && (
            <div className="flex-shrink-0">
              <img
                src={item.image}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-md"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {item.platform}
              </Badge>
              {item.categories && item.categories.length > 0 && (
                <>
                  {item.categories.map((category, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => onCategoryClick(category)}
                      title={`Filter by ${category}`}
                    >
                      {category}
                    </Badge>
                  ))}
                </>
              )}
            </div>

            <h3 className="font-semibold text-lg mb-2">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h3>
            {item.description && (
              <p className="text-muted-foreground mb-2 line-clamp-3">
                {item.description}
              </p>
            )}
            {item.pubDate && (
              <p className="text-sm text-muted-foreground">
                Published: {new Date(item.pubDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
