import { ProcessingHistory } from "@/components/processing/ProcessingHistory";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCanModerateFeed, useFeedItems } from "@/lib/api/feeds";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_layout/feed/$feedId/_tabs/processing")({
  component: ProcessingTab,
});

function ProcessingTab() {
  const { feedId } = Route.useParams();
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<
    string | null
  >(null);

  // Check if user can moderate this feed
  const { data: moderationData, isLoading: isLoadingModeration } =
    useCanModerateFeed(feedId);
  const canModerate = moderationData?.canModerate || false;

  // Get approved submissions for this feed
  const {
    data: submissionsData,
    isLoading: isLoadingSubmissions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchSubmissions,
  } = useFeedItems(feedId, { status: "approved" });

  const submissions = submissionsData?.items || [];

  // Handle expanding/collapsing a submission's processing history
  const toggleExpand = (submissionId: string) => {
    setExpandedSubmissionId(
      expandedSubmissionId === submissionId ? null : submissionId,
    );
  };

  if (isLoadingModeration) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canModerate) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          You need to be a moderator of this feed to view the processing
          history.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Processing History</h1>
        <Button
          variant="outline"
          onClick={() => refetchSubmissions()}
          disabled={isLoadingSubmissions}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoadingSubmissions ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {isLoadingSubmissions ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center p-8 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">
            No approved submissions found in this feed.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Content</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Last Processed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const isExpanded = expandedSubmissionId === submission.tweetId;

                return (
                  <>
                    <TableRow key={submission.tweetId}>
                      <TableCell className="font-medium">
                        {submission.content.length > 100
                          ? `${submission.content.substring(0, 100)}...`
                          : submission.content}
                      </TableCell>
                      <TableCell>
                        {submission.createdAt
                          ? format(
                              new Date(submission.createdAt),
                              "MMM d, yyyy",
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {submission.updatedAt
                          ? format(
                              new Date(submission.updatedAt),
                              "MMM d, yyyy",
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Approved
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => toggleExpand(submission.tweetId)}
                        >
                          {isExpanded ? "Hide Processing" : "View Processing"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0 border-t-0">
                          <div className="p-4 bg-muted/10">
                            <ProcessingHistory
                              submissionId={submission.tweetId}
                              feedId={feedId}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>

          {hasNextPage && (
            <div className="flex justify-center p-4 border-t">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
