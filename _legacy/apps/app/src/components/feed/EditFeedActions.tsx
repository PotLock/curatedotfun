import type { FeedConfig } from "@curatedotfun/types";
import { Button } from "../ui/button";
import { Loading } from "../ui/loading";

interface EditFeedActionsProps {
  currentConfig: FeedConfig | null;
  onSaveChanges: () => Promise<void>;
  onDeleteFeed: () => Promise<void>;
  updateFeedMutation: {
    isPending: boolean;
  };
  deleteFeedMutation: {
    isPending: boolean;
  };
}

export function EditFeedActions({
  onSaveChanges,
  onDeleteFeed,
  updateFeedMutation,
  deleteFeedMutation,
}: EditFeedActionsProps) {
  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          onClick={onSaveChanges}
          disabled={updateFeedMutation.isPending}
          className="flex-1 sm:flex-none"
          size="lg"
        >
          {updateFeedMutation.isPending ? (
            <>
              <Loading />
              <span className="ml-2">Saving...</span>
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          variant="destructive"
          onClick={onDeleteFeed}
          disabled={deleteFeedMutation.isPending}
          className="flex-1 sm:flex-none"
          size="lg"
        >
          {deleteFeedMutation.isPending ? (
            <>
              <Loading />
              <span className="ml-2">Deleting...</span>
            </>
          ) : (
            "Delete Feed"
          )}
        </Button>
      </div>
    </div>
  );
}
