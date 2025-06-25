import {
  ProcessingJob,
  ProcessingJobsResponse,
  ProcessingStep,
  ProcessingStepsResponse,
} from "@curatedotfun/types";
import { useApiQuery, useApiMutation } from "../../hooks/api-client";

/**
 * Fetch processing jobs for a submission
 */
export function useProcessingJobs(
  submissionId: string | null,
  feedId: string | null,
  options?: { enabled?: boolean },
) {
  return useApiQuery<ProcessingJobsResponse, Error, ProcessingJob[]>(
    ["processingJobs", submissionId, feedId],
    `/processing/jobs/${submissionId}?feedId=${feedId}`,
    {
      enabled:
        options?.enabled !== undefined
          ? options.enabled && !!submissionId && !!feedId
          : !!submissionId && !!feedId,
      select: (data) => data.data.jobs,
    },
  );
}

/**
 * Fetch processing steps for a job
 */
export function useProcessingSteps(
  jobId: string | null,
  options?: { enabled?: boolean },
) {
  return useApiQuery<ProcessingStepsResponse, Error, ProcessingStep[]>(
    ["processingSteps", jobId],
    `/processing/jobs/${jobId}/steps`,
    {
      enabled:
        options?.enabled !== undefined ? options.enabled && !!jobId : !!jobId,
      select: (data) => data.data.steps,
    },
  );
}

/**
 * Retry a failed processing job
 */
export function useRetryProcessingJob() {
  return useApiMutation<
    { success: boolean; job: ProcessingJob },
    unknown,
    { jobId: string }
  >(
    {
      method: "POST",
      path: ({ jobId }) => `/processing/jobs/${jobId}/retry`,
      message: "retryProcessingJob",
    },
    {
      onSuccess: () => {
        // Invalidate processing jobs queries to refresh the data
        // This will be handled by the query client's invalidateQueries method
      },
    },
  );
}

/**
 * Retry processing from a specific failed step
 */
export function useRetryProcessingStep() {
  return useApiMutation<
    { success: boolean; job: ProcessingJob },
    unknown,
    { stepId: string }
  >(
    {
      method: "POST",
      path: ({ stepId }) => `/processing/steps/${stepId}/retry`,
      message: "retryProcessingStep",
    },
    {
      onSuccess: () => {
        // Invalidate processing jobs and steps queries to refresh the data
        // This will be handled by the query client's invalidateQueries method
      },
    },
  );
}
