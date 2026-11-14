import type { EmailSummary, RegisterEmailRequest } from "../../../shared/contracts";
import { AppError, emailNotFound } from "./errors";
import { emailModel, type EmailRecord } from "../models/email.model";
import { eventModel } from "../models/event.model";
import { linkModel } from "../models/link.model";
import type { User } from "../types";
import { linkKind, linkLabel } from "./link-kind";

const RECENT_LIMIT = 50;
/**
 * The sender's own browser loads the pixel while Gmail sends, sometimes a moment before the
 * email is registered. Hits that early can't be the recipient (it isn't delivered yet), so on
 * registration they are relabelled as the owner's. Kept short so a registration delayed by the
 * retry queue never swallows a real open.
 */
const PRE_REGISTER_SELF_MS = 2 * 60_000;

const isUniqueViolation = (error: unknown) => error instanceof Error && /UNIQUE constraint failed/i.test(error.message);

async function summarise(db: D1Database, emails: EmailRecord[]): Promise<EmailSummary[]> {
  const tids = emails.map((e) => e.tid);
  const [openStats, clickStats] = await Promise.all([eventModel.openStats(db, tids), eventModel.clickStats(db, tids)]);
  const opensByTid = new Map(openStats.map((s) => [s.tid, s]));

  return emails.map((email) => {
    const opens = opensByTid.get(email.tid);
    return {
      tid: email.tid,
      subject: email.subject,
      recipients: email.recipients,
      sentAt: email.sentAt,
      threadId: email.threadId,
      opens: opens?.opens ?? 0,
      early: opens?.early ?? 0,
      lastOpenedAt: opens?.lastOpenedAt ?? null,
      clicks: clickStats
        .filter((c) => c.tid === email.tid)
        .map(({ label, kind, count }) => ({ label, kind, count })),
    };
  });
}

export const emailService = {
  /** Idempotent: re-registering an email the user already owns succeeds (the extension retries). */
  async register(db: D1Database, user: User, input: RegisterEmailRequest): Promise<void> {
    const sentAt = Date.now();
    const statements = [
      emailModel.insertStatement(db, {
        tid: input.tid,
        userId: user.id,
        subject: input.subject,
        recipients: input.recipients,
        sentAt,
      }),
      ...input.links.map((link) =>
        linkModel.insertStatement(db, {
          lid: link.lid,
          emailTid: input.tid,
          url: link.url,
          label: linkLabel(link.label, link.url),
          kind: linkKind(link.url),
        }),
      ),
      // In the same batch (one transaction): the email is never saved without its own early opens marked.
      eventModel.relabelOpensStatement(db, input.tid, sentAt - PRE_REGISTER_SELF_MS, sentAt, "self"),
    ];
    try {
      await db.batch(statements);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      if (await emailModel.isOwnedBy(db, user.id, input.tid)) return;
      throw new AppError("conflict", "This tracking ID is already in use. Send the email again to get a new one.");
    }
  },

  async attachThread(db: D1Database, user: User, tid: string, threadId: string): Promise<void> {
    const updated = await emailModel.setThreadId(db, user.id, tid, threadId);
    if (!updated) throw emailNotFound();
  },

  async listSummaries(db: D1Database, user: User, threadIds?: string[]): Promise<EmailSummary[]> {
    const emails = threadIds
      ? await emailModel.listByThreadIds(db, user.id, threadIds)
      : await emailModel.listRecent(db, user.id, RECENT_LIMIT);
    return summarise(db, emails);
  },
};
