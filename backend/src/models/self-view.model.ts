export const selfViewModel = {
  async insert(db: D1Database, tid: string, at: number): Promise<void> {
    await db.prepare("INSERT INTO self_views (tid, at) VALUES (?, ?)").bind(tid, at).run();
  },

  async existsBetween(db: D1Database, tid: string, from: number, to: number): Promise<boolean> {
    const row = await db
      .prepare("SELECT 1 AS ok FROM self_views WHERE tid = ? AND at BETWEEN ? AND ? LIMIT 1")
      .bind(tid, from, to)
      .first();
    return row !== null;
  },
};
