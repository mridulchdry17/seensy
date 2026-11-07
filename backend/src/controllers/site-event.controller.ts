import { noContent, readJson } from "../app/http";
import { siteEventSchema } from "../schemas/site-event.schema";
import { validate } from "../schemas/validate";
import { siteEventService } from "../services/site-event.service";
import type { Handler } from "../types";

/**
 * POST /api/site-events — public; the website sends these with navigator.sendBeacon
 * (body is JSON sent as text/plain so no CORS preflight is needed). Recorded after the response.
 */
export const recordSiteEvent: Handler = async (ctx) => {
  const event = validate(siteEventSchema, await readJson(ctx.request));
  ctx.waitUntil(siteEventService.record(ctx.env.DB, event).catch((e) => console.error("site event failed", e)));
  return noContent();
};
