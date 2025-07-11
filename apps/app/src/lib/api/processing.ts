import {
  ProcessingJob,
  ProcessingJobsResponse,
  ProcessingStep,
  ProcessingStepsResponse,
} from "@curatedotfun/types";
import { useApiQuery, useApiMutation } from "../../hooks/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Fetch processing jobs for a submission
 */
export function useProcessingJobs(
  submissionId: string | null,
  feedId: string | null,
  options?: { enabled?: boolean },
) {
  const query = useApiQuery<ProcessingJobsResponse, Error, ProcessingJob[]>(
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

  const isProcessing = query.data?.some((job) => job.status === "processing");

  return useApiQuery<ProcessingJobsResponse, Error, ProcessingJob[]>(
    ["processingJobs", submissionId, feedId],
    `/processing/jobs/${submissionId}?feedId=${feedId}`,
    {
      enabled:
        options?.enabled !== undefined
          ? options.enabled && !!submissionId && !!feedId
          : !!submissionId && !!feedId,
      select: (data) => data.data.jobs,
      refetchInterval: isProcessing ? 5000 : false,
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
  const query = useApiQuery<ProcessingStepsResponse, Error, ProcessingStep[]>(
    ["processingSteps", jobId],
    `/processing/jobs/${jobId}/steps`,
    {
      enabled:
        options?.enabled !== undefined ? options.enabled && !!jobId : !!jobId,
      select: (data) => data.data.steps,
    },
  );

  const isProcessing = query.data?.some((step) => step.status === "processing");

  return useApiQuery<ProcessingStepsResponse, Error, ProcessingStep[]>(
    ["processingSteps", jobId],
    `/processing/jobs/${jobId}/steps`,
    {
      enabled:
        options?.enabled !== undefined ? options.enabled && !!jobId : !!jobId,
      select: (data) => data.data.steps,
      refetchInterval: isProcessing ? 5000 : false,
    },
  );
}

/**
 * Retry a failed processing job
 */
export function useRetryProcessingJob() {
  const queryClient = useQueryClient();
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
      onSuccess: (data) => {
        toast.success("Job retry triggered successfully.");
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast.error(
          `Failed to retry job: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    },
  );
}

/**
 * Retry processing from a specific failed step
 */
export function useRetryProcessingStep() {
  const queryClient = useQueryClient();
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
      onSuccess: (data) => {
        toast.success("Step retry triggered successfully.");
        queryClient.invalidateQueries({
          queryKey: ["processingSteps", data.job.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast.error(
          `Failed to retry step: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    },
  );
}

/**
 * Reprocess a job with the latest config
 */
export function useReprocessJob() {
  const queryClient = useQueryClient();
  return useApiMutation<
    { success: boolean; job: ProcessingJob },
    unknown,
    { jobId: string }
  >(
    {
      method: "POST",
      path: ({ jobId }) => `/processing/jobs/${jobId}/reprocess`,
      message: "reprocessJob",
    },
    {
      onSuccess: (data) => {
        toast.success("Reprocessing job triggered successfully.");
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast.error(
          `Failed to reprocess job: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    },
  );
}

/**
 * Tweak a step's input and reprocess from that point
 */
export function useTweakAndReprocessStep() {
  const queryClient = useQueryClient();
  return useApiMutation<
    { success: boolean; job: ProcessingJob },
    unknown,
    { stepId: string; newInput: string }
  >(
    {
      method: "POST",
      path: ({ stepId }) => `/processing/steps/${stepId}/tweak`,
      message: "tweakAndReprocessStep",
    },
    {
      onSuccess: (data) => {
        toast.success("Tweak and reprocess triggered successfully.");
        queryClient.invalidateQueries({
          queryKey: ["processingSteps", data.job.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast.error(
          `Failed to tweak and reprocess: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      },
    },
  );
}
