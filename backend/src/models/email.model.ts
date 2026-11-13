import type { Stage } from "../../../shared/contracts";
import { placeholders } from "./sql";

export interface EmailRecord {
  tid: string;
  userId: string;
  subject: string;
  recipients: string[];
  threadId: string | null;
  sentAt: number;
  stage: Stage | null;
}

/** What the tracker needs to judge a hit on an email. */
export interface EmailTrackingInfo {
  sentAt: number;
  ownerKey: string;
}

interface EmailRow {
  tid: string;
  user_id: string;
  subject: string;
  recipients: string;
  thread_id: string | null;
  sent_at: number;
  stage: Stage | null;
}

const toRecord = (row: EmailRow): EmailRecord => ({
  tid: row.tid,
  userId: row.user_id,
  subject: row.subject,
  recipients: JSON.parse(row.recipients) as string[],
  threadId: row.thread_id,
  sentAt: row.sent_at,
  stage: row.stage,
});

export const emailModel = {
  insertStatement(db: D1Database, email: Omit<EmailRecord, "threadId" | "stage">): D1PreparedStatement {
    return db
      .prepare("INSERT INTO emails (tid, user_id, subject, recipients, sent_at) VALUES (?, ?, ?, ?, ?)")
      .bind(email.tid, email.userId, email.subject, JSON.stringify(email.recipients), email.sentAt);
  },

  /** Returns true when the email exists and belongs to the user. */
  async setThreadId(db: D1Database, userId: string, tid: string, threadId: string): Promise<boolean> {
    const result = await db
      .prepare("UPDATE emails SET thread_id = ? WHERE tid = ? AND user_id = ?")
      .bind(threadId, tid, userId)
      .run();
    return result.meta.changes > 0;
  },

  async isOwnedBy(db: D1Database, userId: string, tid: string): Promise<boolean> {
    const row = await db.prepare("SELECT 1 AS ok FROM emails WHERE tid = ? AND user_id = ?").bind(tid, userId).first();
    return row !== null;
  },

  async findTrackingInfo(db: D1Database, tid: string): Promise<EmailTrackingInfo | null> {
    const row = await db
      .prepare("SELECT e.sent_at, u.owner_key FROM emails e JOIN users u ON u.id = e.user_id WHERE e.tid = ?")
      .bind(tid)
      .first<{ sent_at: number; owner_key: string }>();
    return row ? { sentAt: row.sent_at, ownerKey: row.owner_key } : null;
  },

  async listRecent(db: D1Database, userId: string, limit: number): Promise<EmailRecord[]> {
    const { results } = await db
      .prepare("SELECT * FROM emails WHERE user_id = ? ORDER BY sent_at DESC LIMIT ?")
      .bind(userId, limit)
      .all<EmailRow>();
    return results.map(toRecord);
  },

  async listByThreadIds(db: D1Database, userId: string, threadIds: string[]): Promise<EmailRecord[]> {
    if (threadIds.length === 0) return [];
    const { results } = await db
      .prepare(`SELECT * FROM emails WHERE user_id = ? AND thread_id IN (${placeholders(threadIds.length)}) ORDER BY sent_at DESC`)
      .bind(userId, ...threadIds)
      .all<EmailRow>();
    return results.map(toRecord);
  },

  /** Emails sent since `since`, newest first (the web app's board). */
  async listSentSince(db: D1Database, userId: string, since: number, limit: number): Promise<EmailRecord[]> {
    const { results } = await db
      .prepare("SELECT * FROM emails WHERE user_id = ? AND sent_at >= ? ORDER BY sent_at DESC LIMIT ?")
      .bind(userId, since, limit)
      .all<EmailRow>();
    return results.map(toRecord);
  },

  /** Returns true when the email exists and belongs to the user. */
  async setStage(db: D1Database, userId: string, tid: string, stage: Stage | null): Promise<boolean> {
    const result = await db
      .prepare("UPDATE emails SET stage = ? WHERE tid = ? AND user_id = ?")
      .bind(stage, tid, userId)
      .run();
    return result.meta.changes > 0;
  },
};
