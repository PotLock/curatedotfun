import { useFeed } from "@/lib/api";
import { RssFeedItem } from "@/types/rss";
import { useQuery } from "@tanstack/react-query";

interface RssFeedData {
  title: string;
  description: string;
  link: string;
  items: RssFeedItem[];
}

async function fetchRssFeed(serviceUrl: string): Promise<RssFeedData> {
  const response = await fetch(`${serviceUrl}/rss.xml`);

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status}`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();

  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // Check for parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML format");
  }

  const channel = xmlDoc.querySelector("channel");
  if (!channel) {
    throw new Error("Invalid RSS feed format");
  }

  const title = channel.querySelector("title")?.textContent || "";
  const description = channel.querySelector("description")?.textContent || "";
  const link = channel.querySelector("link")?.textContent || "";

  const items = Array.from(channel.querySelectorAll("item")).map((item) => {
    const link = item.querySelector("link")?.textContent || "";
    const description = item.querySelector("description")?.textContent || "";

    // Extract image from various sources
    let image =
      item.querySelector("enclosure[type^='image']")?.getAttribute("url") || "";
    if (!image) {
      image =
        item
          .querySelector("media\\:content[type^='image']")
          ?.getAttribute("url") || "";
    }
    if (!image) {
      image =
        item.querySelector("media\\:thumbnail")?.getAttribute("url") || "";
    }
    if (!image && description) {
      const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        image = imgMatch[1];
      }
    }

    // Determine platform from link
    let platform = "other";
    if (link.includes("twitter.com") || link.includes("x.com")) {
      platform = "twitter";
    } else if (link.includes("youtube.com") || link.includes("youtu.be")) {
      platform = "youtube";
    } else if (link.includes("github.com")) {
      platform = "github";
    } else if (link.includes("reddit.com")) {
      platform = "reddit";
    }

    // Extract categories
    const categories = Array.from(item.querySelectorAll("category"))
      .map((cat) => cat.textContent?.trim() || "")
      .filter(Boolean);

    return {
      title: item.querySelector("title")?.textContent || "",
      link,
      description,
      pubDate: item.querySelector("pubDate")?.textContent || "",
      guid: item.querySelector("guid")?.textContent || "",
      image,
      platform,
      categories,
    };
  });

  return { title, description, link, items };
}

export function useRssFeed(feedId: string) {
  const { data: feedData } = useFeed(feedId);

  const rssFeed = feedData?.config.outputs.stream?.distribute?.find(
    (distribute) => distribute.plugin === "@curatedotfun/rss",
  );

  const hasRssFeed = Boolean(rssFeed);
  const serviceUrl = rssFeed?.config?.serviceUrl;

  const {
    data: rssData,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rss-feed", feedId, serviceUrl],
    queryFn: () => fetchRssFeed(serviceUrl!),
    enabled: hasRssFeed && Boolean(serviceUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    hasRssFeed,
    rssData: rssData?.items || [],
    feedInfo: rssData
      ? {
          title: rssData.title,
          description: rssData.description,
          link: rssData.link,
        }
      : null,
    isLoading,
    isError,
    error: error?.message,
  };
}
