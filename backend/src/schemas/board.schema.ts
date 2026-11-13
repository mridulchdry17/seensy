import { z } from "zod";
import { STAGES } from "../../../shared/contracts";

export const boardQuerySchema = z.object({
  /** The browser's Date#getTimezoneOffset(), in minutes (IST is -330). */
  tz: z.coerce.number().int().min(-14 * 60).max(14 * 60).default(0),
});

export const setStageSchema = z.object({
  stage: z.enum(STAGES).nullable(),
});

export const saveUserLinkSchema = z.object({
  name: z.string().trim().min(1, "give the link a name, e.g. Résumé").max(40),
  url: z.string().trim().min(1).max(2048),
});

export const userLinkIdSchema = z.coerce.number().int().positive();
