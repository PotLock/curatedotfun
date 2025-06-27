import type { FeedConfig } from "@curatedotfun/types";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "../hooks/use-toast";
import { useDeleteFeed, useFeed, useUpdateFeed } from "../lib/api";

export function useEditFeed(feedId: string): {
  feedData: unknown;
  isLoadingFeed: boolean;
  feedError: Error | null;
  currentConfig: FeedConfig | null;
  jsonString: string;
  updateFeedMutation: ReturnType<typeof useUpdateFeed>;
  deleteFeedMutation: ReturnType<typeof useDeleteFeed>;
  handleImageUploaded: (ipfsHash: string, ipfsUrl: string) => void;
  handleJsonChange: (newJsonString: string) => void;
  handleConfigChange: (config: FeedConfig) => void;
  handleSaveChanges: () => Promise<void>;
  handleDeleteFeed: () => Promise<void>;
} {
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

  // Initialize config when feed data loads
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

  const handleImageUploaded = (_ipfsHash: string, ipfsUrl: string) => {
    setCurrentConfig((prevConfig) => {
      const newConfig = {
        ...(prevConfig || { id: feedId, name: "", description: "" }),
        image: ipfsUrl,
      } as FeedConfig;
      setJsonString(JSON.stringify(newConfig, null, 2));
      return newConfig;
    });
  };

  const handleJsonChange = (newJsonString: string) => {
    setJsonString(newJsonString);
    try {
      const parsedConfig = JSON.parse(newJsonString);
      setCurrentConfig(parsedConfig);
    } catch (e) {
      console.error("Invalid JSON:", e);
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON syntax and try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfigChange = (config: FeedConfig) => {
    setCurrentConfig(config);
    setJsonString(JSON.stringify(config, null, 2));
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
      await updateFeedMutation.mutateAsync(currentConfig);
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
        navigate({ to: "/profile/my-feeds" });
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

  return {
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
  };
}
