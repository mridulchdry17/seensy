import type { z } from "zod";
import { HttpError } from "../app/http";

/** Validates input against a schema, or throws 400 with field-level details. */
export function validate<Out>(schema: z.ZodType<Out, z.ZodTypeDef, unknown>, input: unknown): Out {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, "Invalid request.", result.error.flatten());
  return result.data;
}
