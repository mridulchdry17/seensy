import type { EventType, Verdict } from "../../../shared/contracts";
import { placeholders } from "./sql";

export interface NewEvent {
  type: EventType;
  tid: string;
  lid: string | null;
  at: number;
  ua: string;
  country: string;
  verdict: Verdict;
}

export interface EmailOpenStats {
  tid: string;
  opens: number;
  early: number;
  lastOpenedAt: number | null;
}

export interface EmailClickStats {
  tid: string;
  label: string;
  kind: string;
  count: number;
}

export interface ActivityRow {
  id: number;
  type: EventType;
  at: number;
  tid: string;
  subject: string;
  recipients: string;
  label: string | null;
  kind: string | null;
}

export const eventModel = {
  async insert(db: D1Database, event: NewEvent): Promise<void> {
    await db
      .prepare("INSERT INTO events (type, tid, lid, at, ua, country, verdict) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(event.type, event.tid, event.lid, event.at, event.ua, event.country, event.verdict)
      .run();
  },

  /** Re-labels opens of an email inside a time window (used when the owner's self-view arrives late). */
  async relabelOpens(db: D1Database, tid: string, from: number, to: number, verdict: Verdict): Promise<void> {
    await db
      .prepare("UPDATE events SET verdict = ? WHERE tid = ? AND type = 'open' AND at BETWEEN ? AND ?")
      .bind(verdict, tid, from, to)
      .run();
  },

  /** Clicks on other links of the same email since `since`, i.e. a scanner's burst. */
  async findClicksOnOtherLinks(db: D1Database, tid: string, lid: string, since: number): Promise<number[]> {
    const { results } = await db
      .prepare("SELECT id FROM events WHERE tid = ? AND type = 'click' AND lid != ? AND at >= ? AND verdict != 'self'")
      .bind(tid, lid, since)
      .all<{ id: number }>();
    return results.map((r) => r.id);
  },

  async relabelByIds(db: D1Database, ids: number[], verdict: Verdict): Promise<void> {
    if (ids.length === 0) return;
    await db
      .prepare(`UPDATE events SET verdict = ? WHERE id IN (${placeholders(ids.length)})`)
      .bind(verdict, ...ids)
      .run();
  },

  async openStats(db: D1Database, tids: string[]): Promise<EmailOpenStats[]> {
    if (tids.length === 0) return [];
    const { results } = await db
      .prepare(
        `SELECT tid,
                SUM(type = 'open' AND verdict = 'person') AS opens,
                SUM(verdict = 'early') AS early,
                MAX(CASE WHEN type = 'open' AND verdict = 'person' THEN at END) AS lastOpenedAt
           FROM events WHERE tid IN (${placeholders(tids.length)}) GROUP BY tid`,
      )
      .bind(...tids)
      .all<EmailOpenStats>();
    return results;
  },

  async clickStats(db: D1Database, tids: string[]): Promise<EmailClickStats[]> {
    if (tids.length === 0) return [];
    const { results } = await db
      .prepare(
        `SELECT e.tid, l.label, l.kind, COUNT(*) AS count
           FROM events e JOIN links l ON l.lid = e.lid
          WHERE e.tid IN (${placeholders(tids.length)}) AND e.type = 'click' AND e.verdict = 'person'
          GROUP BY e.tid, l.lid ORDER BY MIN(e.at)`,
      )
      .bind(...tids)
      .all<EmailClickStats>();
    return results;
  },

  async personActivity(db: D1Database, userId: string, since: number, limit: number): Promise<ActivityRow[]> {
    const { results } = await db
      .prepare(
        `SELECT ev.id, ev.type, ev.at, ev.tid, em.subject, em.recipients, l.label, l.kind
           FROM events ev
           JOIN emails em ON em.tid = ev.tid
           LEFT JOIN links l ON l.lid = ev.lid
          WHERE em.user_id = ? AND ev.verdict = 'person' AND ev.at > ?
          ORDER BY ev.at DESC LIMIT ?`,
      )
      .bind(userId, since, limit)
      .all<ActivityRow>();
    return results;
  },
};
