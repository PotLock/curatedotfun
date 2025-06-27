import type { FeedConfig } from "@curatedotfun/types";

interface EditFeedHeaderProps {
  feedId: string;
  currentConfig: FeedConfig | null;
}

export function EditFeedHeader({ feedId, currentConfig }: EditFeedHeaderProps) {
  return (
    <div className="bg-white p-6 border-b">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Edit Feed: {currentConfig?.name || feedId}
        </h1>
        <p className="text-lg text-gray-600">
          Modify your feed configuration and settings
        </p>
      </div>
    </div>
  );
}
