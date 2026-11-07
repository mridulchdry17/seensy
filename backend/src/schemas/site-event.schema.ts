import { z } from "zod";

export const siteEventSchema = z.object({
  name: z.string().regex(/^[a-z0-9_.:-]{1,40}$/, "must be a short lowercase event name"),
  path: z.string().max(100).default("/"),
  /** Host of the referring site only (e.g. "www.reddit.com"), never a full URL. */
  ref: z.string().max(100).regex(/^[a-z0-9.-]*$/i).default(""),
});
