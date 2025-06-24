import { createFileRoute } from "@tanstack/react-router";
import { EditFeedActions } from "../../../components/feed/EditFeedActions";
import { EditFeedConfigSection } from "../../../components/feed/EditFeedConfigSection";
import { EditFeedHeader } from "../../../components/feed/EditFeedHeader";
import { EditFeedImageSection } from "../../../components/feed/EditFeedImageSection";
import { EditFeedLoadingState } from "../../../components/feed/EditFeedLoadingState";
import { Hero } from "../../../components/Hero";
import { useEditFeed } from "../../../hooks/use-edit-feed";

export const Route = createFileRoute("/_layout/edit/feed/$feedId")({
  component: EditFeedComponent,
});

function EditFeedComponent() {
  const { feedId } = Route.useParams();
  const {
    feedData,
    isLoadingFeed,
    feedError,
    currentConfig,
    jsonString,
    updateFeedMutation,
    deleteFeedMutation,
    handleImageUploaded,
    handleJsonChange,
    handleConfigChange,
    handleSaveChanges,
    handleDeleteFeed,
  } = useEditFeed(feedId);

  // Show loading, error, or not found states
  const loadingState = EditFeedLoadingState({
    isLoadingFeed,
    feedError,
    feedData,
  });

  if (loadingState) {
    return loadingState;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero
        title="Edit your feed configuration"
        description="Modify your feed settings, update images, and manage your content curation preferences."
      />

      <div className="w-full px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <EditFeedHeader feedId={feedId} currentConfig={currentConfig} />

          <EditFeedImageSection
            currentConfig={currentConfig}
            feedId={feedId}
            onImageUploaded={handleImageUploaded}
          />

          <EditFeedConfigSection
            jsonString={jsonString}
            currentConfig={currentConfig}
            onJsonChange={handleJsonChange}
            onConfigChange={handleConfigChange}
          />

          <EditFeedActions
            currentConfig={currentConfig}
            onSaveChanges={handleSaveChanges}
            onDeleteFeed={handleDeleteFeed}
            updateFeedMutation={updateFeedMutation}
            deleteFeedMutation={deleteFeedMutation}
          />
        </div>
      </div>
    </div>
  );
}
