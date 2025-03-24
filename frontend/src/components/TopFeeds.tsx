import React, { useState, useEffect } from "react";
import {
  TwitterSubmissionWithFeedData,
  SubmissionStatus,
} from "../types/twitter";
import { Badge } from "./ui/badge";
import { HiExternalLink } from "react-icons/hi";
import { getTweetUrl } from "../lib/twitter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

// Updated formatDate function to show hours if posted within 24 hours
const formatDate = (dateString: string) => {
  const tweetDate = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - tweetDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  // If posted within the last 24 hours, show "Xh" format
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  // Otherwise, show the date
  return tweetDate.toLocaleDateString();
};

interface TopFeedsProps {
  items: TwitterSubmissionWithFeedData[];
  statusFilter: "all" | SubmissionStatus;
  title?: string;
}

const TopFeeds: React.FC<TopFeedsProps> = ({
  items,
  statusFilter,
  title = "Top Feeds",
}) => {
  const [filteredItems, setFilteredItems] = useState<
    TwitterSubmissionWithFeedData[]
  >([]);

  useEffect(() => {
    // Filter items based on status
    const filtered = items.filter((item) => {
      if (statusFilter === "all") return true;
      return item.status === statusFilter;
    });

    // Sort by submission date (newest first)
    const sorted = filtered.sort((a, b) => {
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Take only the top 3
    setFilteredItems(sorted.slice(0, 3));
  }, [items, statusFilter]);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.tweetId}
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="font-semibold text-sm">@{item.username}</p>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 text-xs">
                  <span>•</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <Badge>{item.status}</Badge>
            </div>

            <h3 className="font-medium text-base mb-2 line-clamp-1">
              {item.title || "Untitled"}
              <a
                href={getTweetUrl(item.tweetId, item.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-block text-gray-500 hover:text-gray-700"
              >
                <HiExternalLink className="inline h-4 w-4" />
              </a>
            </h3>

            <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopFeeds;
