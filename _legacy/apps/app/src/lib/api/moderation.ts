import type {
  CreateModerationRequest,
  ModerationActionCreatedWrappedResponse,
  ModerationActionType,
  Submission,
} from "@curatedotfun/types";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth-context";
import { useApiMutation } from "../../hooks/api-client";
import { toast } from "../../hooks/use-toast";

interface OptimisticUpdateContext {
  previousSubmission?: Submission;
  submissionId: string;
}

const useModerateSubmission = (
  moderationAction: ModerationActionType,
  submissionId: string,
) => {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const { mutate: actualMutate, ...rest } = useApiMutation<
    ModerationActionCreatedWrappedResponse,
    Error,
    CreateModerationRequest,
    OptimisticUpdateContext
  >(
    {
      method: "POST",
      path: `/moderate`,
      message: "moderateSubmission",
    },
    {
      mutationKey: ["moderate", moderationAction, submissionId],
      onMutate: async (variables: CreateModerationRequest) => {
        await queryClient.cancelQueries({
          queryKey: ["submission", variables.submissionId],
        });

        const previousSubmission = queryClient.getQueryData<Submission>([
          "submission",
          variables.submissionId,
        ]);

        if (previousSubmission) {
          queryClient.setQueryData<Submission>(
            ["submission", variables.submissionId],
            (oldData) => {
              if (!oldData) return undefined;
              return {
                ...oldData,
                status:
                  variables.action === "approve" ? "approved" : "rejected",
              };
            },
          );
        }

        return { previousSubmission, submissionId: variables.submissionId };
      },
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
      onError: (error, variables, context) => {
        if (context?.previousSubmission) {
          queryClient.setQueryData<Submission>(
            ["submission", context.submissionId],
            context.previousSubmission,
          );
        }
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
    payload: Omit<
      CreateModerationRequest,
      "action" | "moderatorAccountId" | "moderatorAccountIdType" | "source"
    >,
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
      moderatorAccountIdType: "near",
      source: "ui",
    };
    actualMutate(internalPayload);
  };

  return { mutate, ...rest };
};

export const useApproveSubmission = (submissionId: string) =>
  useModerateSubmission("approve", submissionId);
export const useRejectSubmission = (submissionId: string) =>
  useModerateSubmission("reject", submissionId);
