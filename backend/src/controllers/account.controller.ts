import type { MeResponse } from "../../../shared/contracts";
import { json, readJson } from "../app/http";
import { requireUser } from "../middleware/auth";
import { googleSignInSchema } from "../schemas/auth.schema";
import { activityQuerySchema } from "../schemas/email.schema";
import { validate } from "../schemas/validate";
import { activityService } from "../services/activity.service";
import { authService } from "../services/auth.service";
import type { Handler } from "../types";

export const health: Handler = async () => json({ ok: true });

export const signInWithGoogle: Handler = async (ctx) => {
  const input = validate(googleSignInSchema, await readJson(ctx.request));
  return json(await authService.signInWithGoogle(ctx.env.DB, ctx.env.GOOGLE_CLIENT_ID, input), 201);
};

export const getMe: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const body: MeResponse = { email: user.email, ownerKey: user.ownerKey };
  return json(body);
};

export const listActivity: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const { since } = validate(activityQuerySchema, Object.fromEntries(ctx.url.searchParams));
  return json(await activityService.recent(ctx.env.DB, user, since));
};
