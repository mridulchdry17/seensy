import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.string().trim().email("enter a valid email address").max(320),
  source: z.string().max(40).optional(),
});
