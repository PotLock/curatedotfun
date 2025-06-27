import type { FeedConfig } from "@curatedotfun/types";
import { ImageUpload } from "../ImageUpload";
import { toast } from "../../hooks/use-toast";

interface EditFeedImageSectionProps {
  currentConfig: FeedConfig | null;
  feedId: string;
  onImageUploaded: (ipfsHash: string, ipfsUrl: string) => void;
}

export function EditFeedImageSection({
  currentConfig,
  onImageUploaded,
}: EditFeedImageSectionProps) {
  const handleImageUploaded = (ipfsHash: string, ipfsUrl: string) => {
    onImageUploaded(ipfsHash, ipfsUrl);
    toast({
      title: "Image Updated",
      description: "Image URL has been updated in the JSON config.",
    });
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Feed Image</h2>
        <ImageUpload
          label="Feed Image"
          initialImageUrl={currentConfig?.image || null}
          onUploadSuccess={handleImageUploaded}
          recommendedText="Update the image for this feed."
        />
      </div>
    </div>
  );
}
