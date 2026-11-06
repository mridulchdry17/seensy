import { json, noContent, readJson } from "../app/http";
import { requireUser } from "../middleware/auth";
import {
  attachThreadSchema,
  listEmailsQuerySchema,
  registerEmailSchema,
  trackingIdSchema,
  validate,
} from "../schemas/email.schema";
import { emailService } from "../services/email.service";
import type { Handler } from "../types";

export const registerEmail: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const input = validate(registerEmailSchema, await readJson(ctx.request));
  await emailService.register(ctx.env.DB, user, input);
  return json({ tid: input.tid }, 201);
};

export const listEmails: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const { threadIds } = validate(listEmailsQuerySchema, Object.fromEntries(ctx.url.searchParams));
  return json(await emailService.listSummaries(ctx.env.DB, user, threadIds));
};

export const attachThread: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const tid = validate(trackingIdSchema, ctx.params.tid);
  const { threadId } = validate(attachThreadSchema, await readJson(ctx.request));
  await emailService.attachThread(ctx.env.DB, user, tid, threadId);
  return noContent();
};
