import { z } from "zod";

/**
 * Common validation schemas
 */
export const schemas = {
  pagination: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
  }),
};
