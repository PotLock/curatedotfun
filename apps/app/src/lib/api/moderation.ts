import type {
  CreateModerationRequest,
  ModerationActionCreatedWrappedResponse,
  ModerationActionType,
} from "@curatedotfun/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth-context";
import { useApiMutation } from "../../hooks/api-client";
import { toast } from "../../hooks/use-toast";

const useModerateSubmission = (
  moderationAction: ModerationActionType,
  submissionId: string,
) => {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const { mutate: actualMutate, ...rest } = useApiMutation<
    ModerationActionCreatedWrappedResponse,
    Error,
    CreateModerationRequest
  >(
    {
      method: "POST",
      path: `/moderate`,
      message: "moderateSubmission",
    },
    {
      mutationKey: ["moderate", moderationAction, submissionId],
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        queryClient.invalidateQueries({
          queryKey: ["feed-submissions-paginated", variables.feedId],
        });
        queryClient.invalidateQueries({
          queryKey: ["all-submissions-paginated"],
        });
        toast({
          title: "Success",
          description: `Submission successfully ${variables.action}d.`,
        });
        console.log(
          `Successfully ${variables.action}d submission, invalidated relevant queries.`,
        );
      },
      onError: (error, variables) => {
        toast({
          title: "Error",
          description: `Error ${variables.action === "approve" ? "approving" : "rejecting"} submission.`,
          variant: "destructive",
        });
        console.error(
          `Error ${variables.action === "approve" ? "approving" : "rejecting"} submission:`,
          error,
        );
      },
    },
  );

  const mutate = (
    payload: Omit<CreateModerationRequest, "action" | "moderatorAccountId">,
  ) => {
    if (!auth.isSignedIn || !auth.currentAccountId) {
      console.error(
        "User is not signed in or account ID is missing. Cannot moderate submission.",
      );
      toast({
        title: "Authentication Error",
        description: "You must be signed in to moderate submissions.",
        variant: "destructive",
      });
      return;
    }
    const internalPayload: CreateModerationRequest = {
      ...payload,
      action: moderationAction,
      moderatorAccountId: auth.currentAccountId,
    };
    actualMutate(internalPayload);
  };

  return { mutate, ...rest };
};

export const useApproveSubmission = (submissionId: string) =>
  useModerateSubmission("approve", submissionId);
export const useRejectSubmission = (submissionId: string) =>
  useModerateSubmission("reject", submissionId);
