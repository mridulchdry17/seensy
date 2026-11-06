import type { SelfViewRequest } from "../../../shared/contracts";
import { HttpError } from "../app/http";
import { emailModel } from "../models/email.model";
import { eventModel } from "../models/event.model";
import { linkModel } from "../models/link.model";
import { selfViewModel } from "../models/self-view.model";
import type { HitMeta, User } from "../types";
import { CLICK_BURST_MS, SELF_WINDOW_MS, classifyClick, classifyOpen } from "./verdict";

/** Self-views reported later than this (e.g. from the retry outbox) are pinned to its edge. */
const SELF_VIEW_MAX_AGE_MS = 10 * 60_000;

export interface TrackedLink {
  lid: string;
  url: string;
  emailTid: string;
}

export const trackingService = {
  async recordOpen(db: D1Database, tid: string, meta: HitMeta): Promise<void> {
    const [info, ownerViewed] = await Promise.all([
      emailModel.findTrackingInfo(db, tid),
      selfViewModel.existsBetween(db, tid, meta.at - SELF_WINDOW_MS, meta.at + SELF_WINDOW_MS),
    ]);
    const verdict = classifyOpen({ at: meta.at, ua: meta.ua, sentAt: info?.sentAt ?? null }, ownerViewed);
    await eventModel.insert(db, { type: "open", tid, lid: null, ...meta, verdict });
  },

  async findLink(db: D1Database, lid: string): Promise<TrackedLink | null> {
    const link = await linkModel.findForRedirect(db, lid);
    return link ? { lid, ...link } : null;
  },

  async recordClick(db: D1Database, link: TrackedLink, meta: HitMeta, ownerCookie: string | null): Promise<void> {
    const [info, burstIds] = await Promise.all([
      emailModel.findTrackingInfo(db, link.emailTid),
      eventModel.findClicksOnOtherLinks(db, link.emailTid, link.lid, meta.at - CLICK_BURST_MS),
    ]);
    const clickedByOwner = ownerCookie !== null && ownerCookie === info?.ownerKey;
    const verdict = classifyClick(
      { at: meta.at, ua: meta.ua, sentAt: info?.sentAt ?? null },
      clickedByOwner,
      burstIds.length > 0,
    );
    await eventModel.insert(db, { type: "click", tid: link.emailTid, lid: link.lid, ...meta, verdict });
    if (verdict === "scanner") await eventModel.relabelByIds(db, burstIds, "scanner");
  },

  /** The owner viewed their own email: remember it and re-label any open that already landed. */
  async recordSelfView(db: D1Database, user: User, input: SelfViewRequest): Promise<void> {
    if (!(await emailModel.isOwnedBy(db, user.id, input.tid))) {
      throw new HttpError(404, "No tracked email with this ID on your account.");
    }
    const now = Date.now();
    const at = Math.min(now, Math.max(input.at, now - SELF_VIEW_MAX_AGE_MS));
    await selfViewModel.insert(db, input.tid, at);
    await eventModel.relabelOpens(db, input.tid, at - SELF_WINDOW_MS, at + SELF_WINDOW_MS, "self");
  },
};
