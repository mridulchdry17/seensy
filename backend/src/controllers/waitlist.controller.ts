import { json, readJson } from "../app/http";
import { validate } from "../schemas/validate";
import { waitlistSchema } from "../schemas/waitlist.schema";
import { waitlistService } from "../services/waitlist.service";
import type { Handler } from "../types";

/** POST /api/waitlist — public; called by the website's early-access form. */
export const joinWaitlist: Handler = async (ctx) => {
  const input = validate(waitlistSchema, await readJson(ctx.request));
  await waitlistService.join(ctx.env.DB, input);
  return json({ ok: true }, 201);
};
