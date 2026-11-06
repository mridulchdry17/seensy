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
};
