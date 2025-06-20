import { z } from "zod";
import {
  ApiSuccessResponse,
  ApiSuccessResponseSchema,
  SimpleMessageData,
  SimpleMessageDataSchema,
} from "./common";

export const ModerationActionEnum = z.enum(["approve", "reject"]);
export type ModerationActionType = z.infer<typeof ModerationActionEnum>;

export const ModeratorAccountIdTypeEnum = z.enum(["near", "platform_username"]);
export type ModeratorAccountIdType = z.infer<typeof ModeratorAccountIdTypeEnum>;

export const ModerationSourceEnum = z.enum([
  "ui",
  "platform_comment",
  "auto_approval",
  "super_admin_direct",
]);
export type ModerationSource = z.infer<typeof ModerationSourceEnum>;

export const ModerationActionSchema = z.object({
  id: z.number().int().positive(),
  submissionId: z.string().min(1),
  feedId: z.string().min(1),
  moderatorAccountId: z.string().min(1),
  moderatorAccountIdType: ModeratorAccountIdTypeEnum,
  source: ModerationSourceEnum,
  action: ModerationActionEnum,
  note: z.string().optional().nullable(),
  createdAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updatedAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
});
export type ModerationAction = z.infer<typeof ModerationActionSchema>;

export const CreateModerationRequestSchema = z.object({
  submissionId: z.string().min(1),
  feedId: z.string().min(1),
  moderatorAccountId: z.string().min(1),
  action: ModerationActionEnum,
  note: z.string().optional().nullable(),
});
export type CreateModerationRequest = z.infer<
  typeof CreateModerationRequestSchema
>;

export const ModerationIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive({ message: "ID must be a positive integer" }),
});
export type ModerationIdParam = z.infer<typeof ModerationIdParamSchema>;

export const SubmissionIdParamSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
});
export type SubmissionIdParam = z.infer<typeof SubmissionIdParamSchema>;

export const SubmissionAndFeedIdsParamSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  feedId: z.string().min(1, "Feed ID is required"),
});
export type SubmissionAndFeedIdsParam = z.infer<
  typeof SubmissionAndFeedIdsParamSchema
>;

export const ModerationActionWrappedResponseSchema = ApiSuccessResponseSchema(
  ModerationActionSchema,
);
export type ModerationActionWrappedResponse =
  ApiSuccessResponse<ModerationAction>;

export const ModerationActionListWrappedResponseSchema =
  ApiSuccessResponseSchema(z.array(ModerationActionSchema));
export type ModerationActionListWrappedResponse = ApiSuccessResponse<
  ModerationAction[]
>;

export const ModerationActionCreatedWrappedResponseSchema =
  ApiSuccessResponseSchema(SimpleMessageDataSchema);
export type ModerationActionCreatedWrappedResponse =
  ApiSuccessResponse<SimpleMessageData>;
