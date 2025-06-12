import { useApiMutation } from "../../hooks/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth-context"; // Import useAuth
import { toast } from "../../hooks/use-toast"; // For error notifications

export interface ModerationActionPayload {
  submissionId: string;
  feedId: string;
  note?: string | null;
}

interface InternalModerationPayload extends ModerationActionPayload {
  action: "approve" | "reject";
  adminId: string;
  timestamp: string; // ISO string
}

interface ModerationResponse {
  success: boolean;
  message?: string;
}

export const useApproveSubmission = () => {
  const queryClient = useQueryClient();
  const auth = useAuth(); // Get auth context

  const { mutate: actualMutate, ...rest } = useApiMutation<
    ModerationResponse,
    Error,
    InternalModerationPayload // TVariables for useApiMutation is the actual request body
  >(
    {
      method: "POST",
      path: `/moderate`, // API endpoint for moderation
      message: "approveSubmission", // For signing
    },
    {
      onSuccess: (_data, variables) => {
        // variables is InternalModerationPayload
        queryClient.invalidateQueries({ queryKey: ["submissions"] }); // Generic key
        queryClient.invalidateQueries({
          queryKey: ["feed-submissions-paginated", variables.feedId],
        });
        queryClient.invalidateQueries({
          queryKey: ["all-submissions-paginated"],
        });
        // If feed details show submission counts/status, invalidate them too
        // queryClient.invalidateQueries({ queryKey: ["feed-details", variables.feedId] });
        console.log(
          "Successfully approved submission, invalidated relevant queries.",
        );
      },
      onError: (error) => {
        console.error("Error approving submission:", error);
      },
    },
  );

  const mutate = (payload: ModerationActionPayload) => {
    if (!auth.isSignedIn || !auth.currentAccountId) {
      console.error(
        "User is not signed in or account ID is missing. Cannot approve submission.",
      );
      toast({
        title: "Authentication Error",
        description: "You must be signed in to approve submissions.",
        variant: "destructive",
      });
      return;
    }
    const internalPayload: InternalModerationPayload = {
      ...payload,
      action: "approve",
      adminId: auth.currentAccountId,
      timestamp: new Date().toISOString(),
    };
    actualMutate(internalPayload);
  };

  return { mutate, ...rest };
};

export const useRejectSubmission = () => {
  const queryClient = useQueryClient();
  const auth = useAuth(); // Get auth context

  const { mutate: actualMutate, ...rest } = useApiMutation<
    ModerationResponse,
    Error,
    InternalModerationPayload // TVariables for useApiMutation
  >(
    {
      method: "POST",
      path: `/moderate`,
      message: "rejectSubmission",
    },
    {
      onSuccess: (_data, variables) => {
        // variables is InternalModerationPayload
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        queryClient.invalidateQueries({
          queryKey: ["feed-submissions-paginated", variables.feedId],
        });
        queryClient.invalidateQueries({
          queryKey: ["all-submissions-paginated"],
        });
        // queryClient.invalidateQueries({ queryKey: ["feed-details", variables.feedId] });
        console.log(
          "Successfully rejected submission, invalidated relevant queries.",
        );
      },
      onError: (error) => {
        console.error("Error rejecting submission:", error);
      },
    },
  );

  const mutate = (payload: ModerationActionPayload) => {
    if (!auth.isSignedIn || !auth.currentAccountId) {
      console.error(
        "User is not signed in or account ID is missing. Cannot reject submission.",
      );
      toast({
        title: "Authentication Error",
        description: "You must be signed in to reject submissions.",
        variant: "destructive",
      });
      return;
    }
    const internalPayload: InternalModerationPayload = {
      ...payload,
      action: "reject",
      adminId: auth.currentAccountId,
      timestamp: new Date().toISOString(),
    };
    actualMutate(internalPayload);
  };

  return { mutate, ...rest };
};
