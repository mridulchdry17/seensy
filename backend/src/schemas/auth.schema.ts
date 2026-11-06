import { z } from "zod";

export const googleSignInSchema = z.object({
  idToken: z.string().min(20).max(4096),
  nonce: z.string().min(16).max(128),
});
