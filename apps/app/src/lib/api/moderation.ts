import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface ModerationActionPayload {
  submissionId: string;
  feedId: string;
  note?: string | null;
}

interface InternalModerationPayload extends ModerationActionPayload {
  action: "approve" | "reject";
  adminId: string; // As per backend schema, TODO: replace with real user ID
  timestamp: string; // ISO string
}

const createModerationActionInternal = async (
  payload: InternalModerationPayload,
) => {
  const response = await fetch(`/api/moderate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown server error" }));
    throw new Error(
      `Failed to ${payload.action} submission: ${response.status} ${response.statusText} - ${errorData.error || "Server error"}`,
    );
  }
  return response.json();
};

export const useApproveSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModerationActionPayload) =>
      createModerationActionInternal({
        ...payload,
        action: "approve",
        adminId: "temp-admin-id", // Placeholder
        timestamp: new Date().toISOString(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["feed-submissions-paginated", variables.feedId],
      });
      queryClient.invalidateQueries({
        queryKey: ["all-submissions-paginated"],
      });
      queryClient.invalidateQueries({
        queryKey: ["feed-details", variables.feedId],
      });
      console.log("Successfully approved submission, invalidated queries.");
    },
    onError: (error) => {
      console.error("Error approving submission:", error);
    },
  });
};

export const useRejectSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModerationActionPayload) =>
      createModerationActionInternal({
        ...payload,
        action: "reject",
        adminId: "temp-admin-id",
        timestamp: new Date().toISOString(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["feed-submissions-paginated", variables.feedId],
      });
      queryClient.invalidateQueries({
        queryKey: ["all-submissions-paginated"],
      });
      queryClient.invalidateQueries({
        queryKey: ["feed-details", variables.feedId],
      });
      console.log("Successfully rejected submission, invalidated queries.");
    },
    onError: (error) => {
      console.error("Error rejecting submission:", error);
    },
  });
};
