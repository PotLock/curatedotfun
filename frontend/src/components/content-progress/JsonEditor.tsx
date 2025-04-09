import { Textarea } from "../ui/textarea";

interface JsonEditorProps {
  jsonContent: string;
  onContentChange: (content: string) => void;
}

export function JsonEditor({ jsonContent, onContentChange }: JsonEditorProps) {
  return (
    <Textarea
      className="min-h-[200px] font-mono bg-white"
      value={jsonContent || `{\n  "template": ""\n}`}
      onChange={(e) => onContentChange(e.target.value)}
      placeholder="{"
    />
  );
}
