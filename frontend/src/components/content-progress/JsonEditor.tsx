import { useState, useEffect } from "react";
import { Textarea } from "../ui/textarea";
import { AlertCircle } from "lucide-react";

interface JsonEditorProps {
  jsonContent: string;
  onContentChange: (content: string) => void;
}

export function JsonEditor({ jsonContent, onContentChange }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const validateJson = (content: string): boolean => {
    try {
      if (!content.trim()) return true; // Empty content is valid for our purposes
      JSON.parse(content);
      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid JSON");
      }
      return false;
    }
  };

  const handleContentChange = (content: string) => {
    onContentChange(content);
    if (validateJson(content)) {
      setError(null);
    }
  };

  // Validate initial content
  useEffect(() => {
    validateJson(jsonContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <Textarea
        className={`min-h-[150px] md:min-h-[200px] text-sm md:text-base font-mono bg-white ${
          error ? "border-red-400 focus-visible:ring-red-400" : ""
        }`}
        value={jsonContent || `{\n  "template": ""\n}`}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="{"
      />
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-xs md:text-sm">
          <AlertCircle size={16} />
          <span className="break-all">JSON Error: {error}</span>
        </div>
      )}
    </div>
  );
}
