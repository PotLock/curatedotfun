import { UploadCloud, XCircle } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "../hooks/use-toast";
import { getImageUrl, upload } from "../lib/services/pinata/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loading } from "./ui/loading";

interface ImageUploadProps {
  onUploadSuccess: (ipfsHash: string, ipfsUrl: string) => void;
  initialImageUrl?: string | null;
  label?: string;
  recommendedText?: string;
}

export function ImageUpload({
  onUploadSuccess,
  initialImageUrl,
  label = "Upload Image",
  recommendedText = "Recommended: Square image, at least 400x400px",
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialImageUrl || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(initialImageUrl || null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setUploadError(null);

    try {
      const pinResponse = await upload({ file: selectedFile });
      const ipfsUrl = getImageUrl(pinResponse.IpfsHash);

      setPreviewUrl(ipfsUrl); // Show uploaded image from IPFS
      onUploadSuccess(pinResponse.IpfsHash, ipfsUrl);
      setSelectedFile(null); // Clear selected file after successful upload

      toast({
        title: "Upload Successful",
        description: "Image has been uploaded.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Image upload failed:", error);
      setUploadError(message);
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(initialImageUrl || null);
    setUploadError(null);
    // onUploadSuccess("", ""); // Or a dedicated onRemove prop
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor="image-upload-widget-input"
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-gray-50 flex items-center justify-center">
          {previewUrl && !isLoading ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : isLoading ? (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <UploadCloud className="h-10 w-10 text-gray-400" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input
            id="image-upload-widget-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <label
            htmlFor="image-upload-widget-input"
            className={`inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
              isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            Choose File
          </label>
          {selectedFile && !isLoading && (
            <Button onClick={handleUpload} size="sm" disabled={isLoading}>
              Upload
            </Button>
          )}
        </div>
        {previewUrl && !selectedFile && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="text-red-500 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-1" /> Remove
          </Button>
        )}
      </div>
      {recommendedText && (
        <p className="text-xs text-gray-500">{recommendedText}</p>
      )}
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
    </div>
  );
}
