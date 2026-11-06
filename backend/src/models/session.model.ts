export const sessionModel = {
  async insert(db: D1Database, tokenHash: string, userId: string, createdAt: number): Promise<void> {
    await db
      .prepare("INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)")
      .bind(tokenHash, userId, createdAt)
      .run();
  },
};
