import {
  ProcessingJob,
  ProcessingJobsResponse,
  ProcessingStep,
  ProcessingStepsResponse,
} from "@curatedotfun/types";
import { useApiQuery, useApiMutation } from "../../hooks/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

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
      refetchInterval: (query) =>
        query.state.data?.data.jobs.some(
          (job: ProcessingJob) => job.status === "processing",
        )
          ? 5000
          : false,
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
      refetchInterval: (query) =>
        query.state.data?.data.steps.some(
          (step: ProcessingStep) => step.status === "processing",
        )
          ? 5000
          : false,
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
        toast({
          title: "Success",
          description: "Job retry triggered successfully.",
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to retry job: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
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
        toast({
          title: "Success",
          description: "Step retry triggered successfully.",
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: ["processingSteps", data.job.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to retry step: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
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
        toast({
          title: "Success",
          description: "Reprocessing job triggered successfully.",
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to reprocess job: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
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
        toast({
          title: "Success",
          description: "Tweak and reprocess triggered successfully.",
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: ["processingSteps", data.job.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["processingJobs", data.job.submissionId],
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to tweak and reprocess: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      },
    },
  );
}
