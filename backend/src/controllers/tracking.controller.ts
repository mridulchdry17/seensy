import { ID_PATTERN, OWNER_COOKIE } from "../../../shared/contracts";
import { htmlPage, noContent, pixel, readJson, redirect } from "../app/http";
import { hitMeta, readCookie } from "../app/request-meta";
import { requireUser } from "../middleware/auth";
import { selfViewSchema, validate } from "../schemas/email.schema";
import { trackingService } from "../services/tracking.service";
import type { Handler } from "../types";

const logFailure = (what: string) => (error: unknown) => console.error(`${what} failed`, error);

/** GET /o/:file — always answers with the GIF; recording happens after the response. */
export const openPixel: Handler = async (ctx) => {
  const tid = ctx.params.file?.match(/^([a-z0-9]{12})\.gif$/)?.[1];
  if (tid) {
    ctx.waitUntil(trackingService.recordOpen(ctx.env.DB, tid, hitMeta(ctx.request)).catch(logFailure("record open")));
  }
  return pixel();
};

/** GET /c/:lid — redirects straight away; recording happens after the response. */
export const clickRedirect: Handler = async (ctx) => {
  const lid = ctx.params.lid ?? "";
  const link = ID_PATTERN.test(lid) ? await trackingService.findLink(ctx.env.DB, lid) : null;
  if (!link) {
    return htmlPage(404, "Link not found", "This link doesn't exist or was mistyped. Ask the sender for a fresh link.");
  }
  const ownerCookie = readCookie(ctx.request, OWNER_COOKIE);
  ctx.waitUntil(
    trackingService.recordClick(ctx.env.DB, link, hitMeta(ctx.request), ownerCookie).catch(logFailure("record click")),
  );
  return redirect(link.url);
};

/** POST /api/self-views — the owner is looking at their own sent email. */
export const recordSelfView: Handler = async (ctx) => {
  const user = await requireUser(ctx);
  const input = validate(selfViewSchema, await readJson(ctx.request));
  await trackingService.recordSelfView(ctx.env.DB, user, input);
  return noContent();
};
