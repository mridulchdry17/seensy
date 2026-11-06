export const waitlistModel = {
  /** Adds the email once; signing up again is a no-op. */
  async add(db: D1Database, email: string, source: string, createdAt: number): Promise<void> {
    await db
      .prepare("INSERT OR IGNORE INTO waitlist (email, source, created_at) VALUES (?, ?, ?)")
      .bind(email, source, createdAt)
      .run();
  },
};
