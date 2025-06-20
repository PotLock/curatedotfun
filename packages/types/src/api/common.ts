import { z } from "zod";

export const ApiResponseBaseSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  message: z.string().optional(),
  code: z.string().optional(),
  timestamp: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});
export type ApiResponseBase = z.infer<typeof ApiResponseBaseSchema>;

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataType: T) =>
  ApiResponseBaseSchema.extend({
    success: z.literal(true),
    data: dataType.optional(),
  });

export type ApiSuccessResponse<T> = Omit<ApiResponseBase, "message"> & {
  success: true;
  data?: T;
};

export const ApiErrorResponseSchema = ApiResponseBaseSchema.extend({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const SimpleMessageDataSchema = z.object({
  message: z.string().describe("A success or informational message"),
});
export type SimpleMessageData = z.infer<typeof SimpleMessageDataSchema>;

export const NoContentDataSchema = z
  .undefined()
  .describe("Represents no data payload");
