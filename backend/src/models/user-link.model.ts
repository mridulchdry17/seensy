export interface UserLinkRecord {
  id: number;
  name: string;
  url: string;
  urlKey: string;
}

interface UserLinkRow {
  id: number;
  name: string;
  url: string;
  url_key: string;
}

const toRecord = (row: UserLinkRow): UserLinkRecord => ({ id: row.id, name: row.name, url: row.url, urlKey: row.url_key });

export const userLinkModel = {
  async list(db: D1Database, userId: string): Promise<UserLinkRecord[]> {
    const { results } = await db
      .prepare("SELECT id, name, url, url_key FROM user_links WHERE user_id = ? ORDER BY id")
      .bind(userId)
      .all<UserLinkRow>();
    return results.map(toRecord);
  },

  /** Saving the same link again renames it instead of adding a duplicate. */
  async upsert(db: D1Database, userId: string, link: Omit<UserLinkRecord, "id">, createdAt: number): Promise<UserLinkRecord> {
    const row = await db
      .prepare(
        `INSERT INTO user_links (user_id, name, url_key, url, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, url_key) DO UPDATE SET name = excluded.name, url = excluded.url
         RETURNING id, name, url, url_key`,
      )
      .bind(userId, link.name, link.urlKey, link.url, createdAt)
      .first<UserLinkRow>();
    return toRecord(row!);
  },


  /** Returns true when the link existed and belonged to the user. */
  async remove(db: D1Database, userId: string, id: number): Promise<boolean> {
    const result = await db.prepare("DELETE FROM user_links WHERE id = ? AND user_id = ?").bind(id, userId).run();
    return result.meta.changes > 0;
  },
};
