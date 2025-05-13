import { z } from 'zod';

export const socialImageSchema = z.object({
  url: z.string().url().optional(),
  ipfs_cid: z.string().optional(),
}).strict();

export const profileSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  image: socialImageSchema.optional(),
  backgroundImage: socialImageSchema.optional(),
  linktree: z.record(z.string(), z.string().url()).optional(),
}).strict();

// You can infer TypeScript types from Zod schemas if needed elsewhere
export type Profile = z.infer<typeof profileSchema>;
export type SocialImage = z.infer<typeof socialImageSchema>;
