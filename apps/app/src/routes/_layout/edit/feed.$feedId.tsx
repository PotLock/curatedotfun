import type { FeedConfig } from "@curatedotfun/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { JsonEditor } from "../../../components/content-progress/JsonEditor";
import { ImageUpload } from "../../../components/ImageUpload";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Loading } from "../../../components/ui/loading";
import { toast } from "../../../hooks/use-toast";
import { useDeleteFeed, useFeed, useUpdateFeed } from "../../../lib/api";

export const Route = createFileRoute("/_layout/edit/feed/$feedId")({
  component: EditFeedComponent,
});

function EditFeedComponent() {
  const { feedId } = Route.useParams();
  const navigate = useNavigate();
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    error: feedError,
  } = useFeed(feedId);
  const updateFeedMutation = useUpdateFeed(feedId);
  const deleteFeedMutation = useDeleteFeed(feedId);

  const [currentConfig, setCurrentConfig] = useState<FeedConfig | null>(null);
  const [jsonString, setJsonString] = useState<string>("");

  const handleImageUploaded = (_ipfsHash: string, ipfsUrl: string) => {
    setCurrentConfig((prevConfig) => {
      const newConfig = {
        ...(prevConfig || { id: feedId, name: "", description: "" }),
        image: ipfsUrl,
      } as FeedConfig;
      setJsonString(JSON.stringify(newConfig, null, 2));
      return newConfig;
    });
    toast({
      title: "Image Updated",
      description: "Image URL has been updated in the JSON config.",
    });
  };

  useEffect(() => {
    if (feedData?.config) {
      const configWithPotentiallyMissingFields: FeedConfig = {
        // Ensure all fields from the schema are present, providing defaults if necessary
        // This is important because feedData.config might be from the simpler API type
        id: feedData.config.id,
        name: feedData.config.name,
        description: feedData.config.description,
        image: feedData.config.image || undefined,
        enabled: feedData.config.enabled || false,
        moderation: feedData.config.moderation || {
          approvers: { twitter: [] },
        }, // Default
        outputs: feedData.config.outputs || { stream: { enabled: false } },
        pollingIntervalMs: feedData.config.pollingIntervalMs || undefined,
        sources: feedData.config.sources || [],
        ingestion: feedData.config.ingestion || undefined,
      };
      setCurrentConfig(configWithPotentiallyMissingFields);
      setJsonString(
        JSON.stringify(configWithPotentiallyMissingFields, null, 2),
      );
    }
  }, [feedData]);

  const handleJsonChange = (newJsonString: string) => {
    setJsonString(newJsonString);
    try {
      const parsedConfig = JSON.parse(newJsonString);
      setCurrentConfig(parsedConfig);
    } catch (e) {
      console.error("Invalid JSON:", e);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentConfig) {
      toast({
        title: "Error",
        description: "No configuration to save.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateFeedMutation.mutateAsync({ config: currentConfig });
      toast({
        title: "Success",
        description: "Feed configuration updated successfully.",
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to update feed:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Could not update feed configuration.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeed = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this feed? This action cannot be undone.",
      )
    ) {
      try {
        await deleteFeedMutation.mutateAsync();
        toast({ title: "Success", description: "Feed deleted successfully." });
        navigate({ to: "/" });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Failed to delete feed:", err);
        toast({
          title: "Deletion Failed",
          description: err.message || "Could not delete feed.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoadingFeed)
    return (
      <div className="p-4">
        <Loading /> <p>Loading feed details...</p>
      </div>
    );
  if (feedError)
    return (
      <Alert variant="destructive" className="m-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Feed</AlertTitle>
        <AlertDescription>{feedError.message}</AlertDescription>
      </Alert>
    );
  if (!feedData) return <div className="p-4">Feed not found.</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Feed: {currentConfig?.name || feedId}
      </h1>

      <ImageUpload
        label="Feed Image"
        initialImageUrl={currentConfig?.image || null}
        onUploadSuccess={handleImageUploaded}
        recommendedText="Update the image for this feed."
      />

      <div className="space-y-2">
        <Label>Feed Configuration (JSON)</Label>
        <JsonEditor
          jsonContent={jsonString}
          onContentChange={handleJsonChange}
        />
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={handleSaveChanges}
          disabled={updateFeedMutation.isPending}
        >
          {updateFeedMutation.isPending ? <Loading /> : null}
          Save Changes
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteFeed}
          disabled={deleteFeedMutation.isPending}
        >
          {deleteFeedMutation.isPending ? <Loading /> : null}
          Delete Feed
        </Button>
      </div>
    </div>
  );
}
