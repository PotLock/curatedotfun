import { JsonEditor } from "../../../components/content-progress/JsonEditor";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Loading } from "../../../components/ui/loading";
import { toast } from "../../../hooks/use-toast";
import { useDeleteFeed, useFeed, useUpdateFeed } from "../../../lib/api";
import type { FeedConfig } from "@curatedotfun/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [imageUrlPreview, setImageUrlPreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    if (feedData?.config) {
      const configWithPotentiallyMissingFields: FeedConfig = {
        // Ensure all fields from the schema are present, providing defaults if necessary
        // This is important because feedData.config might be from the simpler API type
        id: feedData.config.id,
        name: feedData.config.name,
        description: feedData.config.description,
        image: feedData.config.image || undefined,
        enabled:
          feedData.config.enabled !== undefined
            ? feedData.config.enabled
            : true, // Default to true if undefined
        moderation: feedData.config.moderation || {
          approvers: { twitter: [] },
        }, // Default
        outputs: feedData.config.outputs || { stream: { enabled: false } }, // Default
        // Add other fields from FeedConfig (from @curatedotfun/types) with defaults if not in feedData.config
        pollingIntervalMs:
          (feedData.config).pollingIntervalMs || undefined,
        sources: (feedData.config).sources || [],
        ingestion: (feedData.config).ingestion || undefined,
      };
      setCurrentConfig(configWithPotentiallyMissingFields);
      setJsonString(
        JSON.stringify(configWithPotentiallyMissingFields, null, 2),
      );
      if (configWithPotentiallyMissingFields.image) {
        setImageUrlPreview(configWithPotentiallyMissingFields.image);
      }
    }
  }, [feedData]);

  const handleJsonChange = (newJsonString: string) => {
    setJsonString(newJsonString);
    try {
      const parsedConfig = JSON.parse(newJsonString);
      setCurrentConfig(parsedConfig);
    } catch (e) {
      // Error will be shown by JsonEditor, but we might want to prevent setting invalid config
      console.error("Invalid JSON:", e);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        if (!import.meta.env.PUBLIC_PINATA_JWT_KEY) {
          throw new Error("Pinata JWT key is not configured");
        }

        const response = await fetch(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.PUBLIC_PINATA_JWT_KEY}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to upload file to Pinata" }));
          throw new Error(
            errorData.message || "Failed to upload file to Pinata",
          );
        }

        const data = await response.json();
        const ipfsUrl = `https://ipfs.io/ipfs/${data.IpfsHash}`;
        setImageUrlPreview(ipfsUrl);
        toast({
          title: "Image Uploaded",
          description:
            "You can copy the URL below and paste it into the 'image' field in the JSON config.",
        });
      } catch (error) {
        console.error("Error uploading file to Pinata:", error);
        toast({
          title: "Upload Failed",
          description:
            error.message || "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        setImageUrlPreview(null);
      } finally {
        setIsUploadingImage(false);
      }
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
      // Validate currentConfig against FeedConfigSchema if possible, or ensure it's well-formed
      // For now, we assume currentConfig is valid if JSON.parse succeeded
      await updateFeedMutation.mutateAsync({ config: currentConfig });
      toast({
        title: "Success",
        description: "Feed configuration updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update feed:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update feed configuration.",
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
        navigate({ to: "/" }); // Navigate to homepage or feeds list
      } catch (error) {
        console.error("Failed to delete feed:", error);
        toast({
          title: "Deletion Failed",
          description: error.message || "Could not delete feed.",
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
      <h1 className="text-2xl font-bold">Edit Feed: {feedData.name}</h1>

      <div className="space-y-2">
        <Label htmlFor="image-upload-input">Upload New Image</Label>
        <Input
          id="image-upload-input"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isUploadingImage}
        />
        {isUploadingImage && <Loading />}
        {imageUrlPreview && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-muted-foreground">
              Image uploaded. Copy this URL into the JSON config's "image"
              field:
            </p>
            <Input
              type="text"
              readOnly
              value={imageUrlPreview}
              className="font-mono"
            />
            <img
              src={imageUrlPreview}
              alt="Preview"
              className="mt-2 max-w-xs h-auto rounded border"
            />
          </div>
        )}
      </div>

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
          disabled={updateFeedMutation.isPending || isUploadingImage}
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
