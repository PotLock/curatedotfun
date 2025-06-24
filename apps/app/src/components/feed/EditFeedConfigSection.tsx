import type { FeedConfig } from "@curatedotfun/types";
import { useState, useRef } from "react";
import { JsonEditor } from "../content-progress/JsonEditor";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { EditFeedForm, type EditFeedFormRef } from "./EditFeedForm";

interface EditFeedConfigSectionProps {
  jsonString: string;
  currentConfig: FeedConfig | null;
  onJsonChange: (newJsonString: string) => void;
  onConfigChange: (config: FeedConfig) => void;
}

export function EditFeedConfigSection({
  jsonString,
  currentConfig,
  onJsonChange,
  onConfigChange,
}: EditFeedConfigSectionProps) {
  const [isJsonMode, setIsJsonMode] = useState(false);
  const formRef = useRef<EditFeedFormRef>(null);

  const handleConfigChange = (config: FeedConfig) => {
    onConfigChange(config);
    // Also update the JSON string to keep them in sync
    onJsonChange(JSON.stringify(config, null, 2));
  };

  const handleSwitchToFormMode = () => {
    setIsJsonMode(false);
    // Trigger form update after switching to form mode
    setTimeout(() => {
      formRef.current?.updateFromConfig();
    }, 0);
  };

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Feed Configuration</h2>
            <p className="text-gray-600">
              {isJsonMode
                ? "Edit the JSON configuration directly to fine-tune your feed settings"
                : "Use the form below to easily configure your feed settings"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={!isJsonMode ? "default" : "outline"}
              size="sm"
              onClick={handleSwitchToFormMode}
            >
              Form View
            </Button>
            <Button
              variant={isJsonMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsJsonMode(true)}
            >
              JSON View
            </Button>
          </div>
        </div>

        {isJsonMode ? (
          <div className="space-y-2">
            <Label>Feed Configuration (JSON)</Label>
            <JsonEditor
              jsonContent={jsonString}
              onContentChange={onJsonChange}
            />
          </div>
        ) : (
          <EditFeedForm
            ref={formRef}
            currentConfig={currentConfig}
            onConfigChange={handleConfigChange}
          />
        )}
      </div>
    </div>
  );
}
