import { z } from "zod";
import { ID_PATTERN } from "../../../shared/contracts";
import { HttpError } from "../app/http";

export const trackingIdSchema = z.string().regex(ID_PATTERN, "must be 12 lowercase letters or digits");

export const registerEmailSchema = z.object({
  tid: trackingIdSchema,
  subject: z.string().max(500),
  recipients: z.array(z.string().email().max(320)).min(1).max(100),
  links: z
    .array(
      z.object({
        lid: trackingIdSchema,
        url: z.string().url().max(2048).regex(/^https?:\/\//i, "must be an http(s) URL"),
        label: z.string().max(120),
      }),
    )
    .max(50)
    .refine((links) => new Set(links.map((l) => l.lid)).size === links.length, "link ids must be unique"),
});

export const attachThreadSchema = z.object({
  threadId: z.string().min(1).max(64),
});

export const selfViewSchema = z.object({
  tid: trackingIdSchema,
  at: z.number().int().positive(),
});

export const listEmailsQuerySchema = z.object({
  threadIds: z
    .string()
    .optional()
    .transform((value) => value?.split(",").filter(Boolean).slice(0, 100)),
});

export const activityQuerySchema = z.object({
  since: z.coerce.number().int().nonnegative().default(0),
});

/** Validates input against a schema, or throws 400 with field-level details. */
export function validate<Out>(schema: z.ZodType<Out, z.ZodTypeDef, unknown>, input: unknown): Out {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, "Invalid request.", result.error.flatten());
  return result.data;
}
