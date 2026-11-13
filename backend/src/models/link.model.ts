export interface LinkRecord {
  lid: string;
  emailTid: string;
  url: string;
  label: string;
  kind: string;
}

export const linkModel = {
  insertStatement(db: D1Database, link: LinkRecord): D1PreparedStatement {
    return db
      .prepare("INSERT INTO links (lid, email_tid, url, label, kind) VALUES (?, ?, ?, ?, ?)")
      .bind(link.lid, link.emailTid, link.url, link.label, link.kind);
  },

  async findForRedirect(db: D1Database, lid: string): Promise<{ url: string; emailTid: string } | null> {
    const row = await db
      .prepare("SELECT url, email_tid FROM links WHERE lid = ?")
      .bind(lid)
      .first<{ url: string; email_tid: string }>();
    return row ? { url: row.url, emailTid: row.email_tid } : null;
  },

  /** Links in the user's emails sent since `since` (the web app's board). */
  async listForEmailsSentSince(db: D1Database, userId: string, since: number): Promise<LinkRecord[]> {
    const { results } = await db
      .prepare(
        `SELECT l.lid, l.email_tid, l.url, l.label, l.kind
           FROM links l JOIN emails em ON em.tid = l.email_tid
          WHERE em.user_id = ? AND em.sent_at >= ?`,
      )
      .bind(userId, since)
      .all<{ lid: string; email_tid: string; url: string; label: string; kind: string }>();
    return results.map((row) => ({ lid: row.lid, emailTid: row.email_tid, url: row.url, label: row.label, kind: row.kind }));
  },
};
