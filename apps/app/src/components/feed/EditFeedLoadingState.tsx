import { Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Loading } from "../ui/loading";

interface EditFeedLoadingStateProps {
  isLoadingFeed: boolean;
  feedError: Error | null;
  feedData: unknown;
}

export function EditFeedLoadingState({
  isLoadingFeed,
  feedError,
  feedData,
}: EditFeedLoadingStateProps) {
  if (isLoadingFeed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <Loading />
          <p className="text-lg text-gray-600">Loading feed details...</p>
        </div>
      </div>
    );
  }

  if (feedError) {
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Feed</AlertTitle>
        <AlertDescription>{feedError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!feedData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Feed not found.</p>
      </div>
    );
  }

  return null;
}
