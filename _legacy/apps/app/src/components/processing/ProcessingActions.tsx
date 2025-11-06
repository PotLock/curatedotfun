import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useReprocessJob,
  useRetryProcessingJob,
  useRetryProcessingStep,
} from "@/lib/api/processing";
import type { ProcessingJob, ProcessingStep } from "@curatedotfun/types";
import { Loader2, RefreshCcw, RotateCw } from "lucide-react";

interface ProcessingActionsProps {
  job: ProcessingJob;
  step?: ProcessingStep;
}

export function ProcessingActions({ job, step }: ProcessingActionsProps) {
  const retryJob = useRetryProcessingJob();
  const retryStep = useRetryProcessingStep();
  const reprocessJob = useReprocessJob();

  const handleRetry = () => {
    if (step) {
      retryStep.mutate({ stepId: step.id });
    } else {
      retryJob.mutate({ jobId: job.id });
    }
  };

  const handleReprocessWithLatestConfig = () => {
    reprocessJob.mutate({ jobId: job.id });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {!step && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocessWithLatestConfig}
                disabled={reprocessJob.isPending}
              >
                {reprocessJob.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Reprocess
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Create a new processing job for this submission using the latest
                feed configuration.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryJob.isPending || retryStep.isPending}
            >
              {retryJob.isPending || retryStep.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              {step ? "Retry Step" : "Retry Failed"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {step
                ? "Retry the job starting from this specific step."
                : "Retry all failed steps in this job."}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
