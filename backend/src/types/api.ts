import { z } from "zod";

/**
 * Common validation schemas
 */
export const schemas = {
  pagination: z.object({
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((n) => n > 0 && n <= 100, {
        message: "Limit must be between 1 and 100",
      })
      .optional(),
    offset: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((n) => n >= 0, { message: "Offset must be non-negative" })
      .optional(),
  }),
};
