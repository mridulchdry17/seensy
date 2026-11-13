import { json, noContent, readJson } from "../app/http";
import { requireUser } from "../middleware/auth";
import { boardQuerySchema, saveUserLinkSchema, setStageSchema, userLinkIdSchema } from "../schemas/board.schema";
import { trackingIdSchema } from "../schemas/email.schema";
import { validate } from "../schemas/validate";
import { boardService } from "../services/board.service";
import { userLinkService } from "../services/user-link.service";
import type { Handler } from "../types";

/** GET /api/board?tz= — every recent email with its Hot/Warm/Seen signal. */
export const getBoard: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const { tz } = validate(boardQuerySchema, Object.fromEntries(ctx.url.searchParams));
  return json(await boardService.board(ctx.env.DB, user, tz));
};

export const getTimeline: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const tid = validate(trackingIdSchema, ctx.params.tid);
  return json(await boardService.timeline(ctx.env.DB, user, tid));
};

export const setStage: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const tid = validate(trackingIdSchema, ctx.params.tid);
  const { stage } = validate(setStageSchema, await readJson(ctx.request));
  await boardService.setStage(ctx.env.DB, user, tid, stage);
  return noContent();
};

export const listUserLinks: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  return json(await userLinkService.list(ctx.env.DB, user));
};

export const saveUserLink: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const input = validate(saveUserLinkSchema, await readJson(ctx.request));
  return json(await userLinkService.save(ctx.env.DB, user, input), 201);
};

export const removeUserLink: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const id = validate(userLinkIdSchema, ctx.params.id);
  await userLinkService.remove(ctx.env.DB, user, id);
  return noContent();
};
