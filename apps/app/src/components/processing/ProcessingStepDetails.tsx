import { ProcessingStep } from "@/types/processing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";
import { useRetryProcessingStep } from "@/lib/api";

interface ProcessingStepDetailsProps {
  step: ProcessingStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessingStepDetails({
  step,
  open,
  onOpenChange,
}: ProcessingStepDetailsProps) {
  const { mutate: retryStep, isPending: isRetrying } = useRetryProcessingStep();

  if (!step) return null;

  const formatJson = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const formatDuration = () => {
    if (!step.startedAt || !step.completedAt) return "N/A";

    const start = new Date(step.startedAt);
    const end = new Date(step.completedAt);
    const durationMs = end.getTime() - start.getTime();

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else {
      return `${(durationMs / 1000).toFixed(2)}s`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Processing Step: {step.pluginName}
              <Badge
                variant={
                  step.status === "success"
                    ? "secondary"
                    : step.status === "failed"
                      ? "destructive"
                      : step.status === "processing"
                        ? "default"
                        : "outline"
                }
              >
                {step.status}
              </Badge>
            </div>
            {step.status === "failed" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  retryStep({ stepId: step.id });
                  onOpenChange(false); // Close dialog after initiating retry
                }}
                disabled={isRetrying}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                Retry from this step
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
              <div>
                <span className="text-muted-foreground">Type:</span> {step.type}
              </div>
              <div>
                <span className="text-muted-foreground">Stage:</span>{" "}
                {step.stage}
              </div>
              <div>
                <span className="text-muted-foreground">Started:</span>{" "}
                {step.startedAt
                  ? format(new Date(step.startedAt), "MMM d, yyyy HH:mm:ss")
                  : "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Completed:</span>{" "}
                {step.completedAt
                  ? format(new Date(step.completedAt), "MMM d, yyyy HH:mm:ss")
                  : "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                {formatDuration()}
              </div>
              <div>
                <span className="text-muted-foreground">Step Order:</span>{" "}
                {step.stepOrder}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="input" className="flex-1 flex flex-col mt-4">
          <TabsList>
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
            {step.error && <TabsTrigger value="error">Error</TabsTrigger>}
          </TabsList>
          <TabsContent value="input" className="flex-1 overflow-hidden">
            <div className="h-[300px] w-full rounded-md border p-4 overflow-auto">
              <pre className="text-sm">{formatJson(step.input)}</pre>
            </div>
          </TabsContent>
          <TabsContent value="output" className="flex-1 overflow-hidden">
            <div className="h-[300px] w-full rounded-md border p-4 overflow-auto">
              <pre className="text-sm">
                {step.output ? formatJson(step.output) : "No output data"}
              </pre>
            </div>
          </TabsContent>
          {step.error && (
            <TabsContent value="error" className="flex-1 overflow-hidden">
              <div className="h-[300px] w-full rounded-md border p-4 bg-red-50 dark:bg-red-950 overflow-auto">
                <pre className="text-sm text-red-600 dark:text-red-400">
                  {formatJson(step.error)}
                </pre>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
