import type { BoardEmail, BoardResponse, LinkClickSummary, Stage, TimelineItem } from "../../../shared/contracts";
import { emailNotFound } from "./errors";
import { emailModel } from "../models/email.model";
import { eventModel } from "../models/event.model";
import { linkModel } from "../models/link.model";
import { userLinkModel } from "../models/user-link.model";
import type { User } from "../types";
import { assignSignals, engagement, localDay, type Hit } from "./signal";
import { linkNamer } from "./user-link.service";

const DAY = 24 * 60 * 60 * 1000;
/** The board shows emails sent in this window... */
const BOARD_WINDOW_MS = 120 * DAY;
/** ...up to this many. */
const BOARD_LIMIT = 300;

interface EmailHits {
  hits: Hit[];
  /** Clicks per link id, in first-click order (Map keeps insertion order). */
  clicksByLid: Map<string, number>;
}

export const boardService = {
  /** Every recent email with its signal, plus yesterday's totals. `tzOffset` = Date#getTimezoneOffset(). */
  async board(db: D1Database, user: User, tzOffset: number): Promise<BoardResponse> {
    const now = Date.now();
    const since = now - BOARD_WINDOW_MS;
    const [emails, hitRows, links, saved] = await Promise.all([
      emailModel.listSentSince(db, user.id, since, BOARD_LIMIT),
      eventModel.hitsForEmailsSentSince(db, user.id, since, BOARD_LIMIT),
      linkModel.listForEmailsSentSince(db, user.id, since, BOARD_LIMIT),
      userLinkModel.list(db, user.id),
    ]);

    const nameOf = linkNamer(saved);
    const linkByLid = new Map(links.map((link) => [link.lid, link]));
    const yesterday = localDay(now, tzOffset) - 1;
    const isYesterday = (at: number) => localDay(at, tzOffset) === yesterday;
    const openedYesterday = new Set<string>();
    let clicksYesterday = 0;

    const byTid = new Map<string, EmailHits>();
    for (const row of [...hitRows].sort((a, b) => a.at - b.at)) {
      const entry = byTid.get(row.tid) ?? { hits: [], clicksByLid: new Map<string, number>() };
      byTid.set(row.tid, entry);
      entry.hits.push({ type: row.type, at: row.at });
      if (row.type === "click" && row.lid) entry.clicksByLid.set(row.lid, (entry.clicksByLid.get(row.lid) ?? 0) + 1);
      if (isYesterday(row.at)) {
        if (row.type === "open") openedYesterday.add(row.tid);
        else clicksYesterday += 1;
      }
    }

    const scored = emails.map((email) => {
      const entry = byTid.get(email.tid);
      return { email, entry, eng: engagement(entry?.hits ?? [], now, tzOffset) };
    });
    const signals = assignSignals(
      scored.map(({ email, eng }) => ({ tid: email.tid, score: eng.score, lastAt: eng.lastAt, ranked: email.stage === null })),
      now,
    );

    const board: BoardEmail[] = scored.map(({ email, entry, eng }) => {
      const clicks: LinkClickSummary[] = [];
      for (const [lid, count] of entry?.clicksByLid ?? []) {
        const link = linkByLid.get(lid);
        if (link) clicks.push({ label: nameOf(link.url, link.label), kind: link.kind, count });
      }
      return {
        tid: email.tid,
        subject: email.subject,
        recipients: email.recipients,
        sentAt: email.sentAt,
        threadId: email.threadId,
        stage: email.stage,
        signal: signals.get(email.tid) ?? "none",
        visits: eng.visits,
        openDays: eng.days,
        clicks,
        lastActivityAt: eng.lastAt,
      };
    });

    return {
      emails: board,
      yesterday: {
        sent: emails.filter((e) => isYesterday(e.sentAt)).length,
        opened: openedYesterday.size,
        clicks: clicksYesterday,
      },
    };
  },

  /** Opens and clicks by real people on one of the user's emails, oldest first. */
  async timeline(db: D1Database, user: User, tid: string): Promise<TimelineItem[]> {
    if (!(await emailModel.isOwnedBy(db, user.id, tid))) throw emailNotFound();
    const [rows, saved] = await Promise.all([eventModel.personTimeline(db, tid), userLinkModel.list(db, user.id)]);
    const nameOf = linkNamer(saved);
    return rows.map((row) => ({
      type: row.type,
      at: row.at,
      link: row.url !== null && row.label !== null && row.kind !== null ? { label: nameOf(row.url, row.label), kind: row.kind } : null,
    }));
  },

  async setStage(db: D1Database, user: User, tid: string, stage: Stage | null): Promise<void> {
    if (!(await emailModel.setStage(db, user.id, tid, stage))) throw emailNotFound();
  },
};
