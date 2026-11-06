import type { MeResponse } from "../../../shared/contracts";
import { json } from "../app/http";
import { requireUser } from "../middleware/auth";
import { activityQuerySchema, validate } from "../schemas/email.schema";
import { activityService } from "../services/activity.service";
import type { Handler } from "../types";

export const health: Handler = async () => json({ ok: true });

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
