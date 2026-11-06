import type { User } from "../types";

interface UserRow {
  id: string;
  email: string;
  owner_key: string;
}

const COLUMNS = "u.id, u.email, u.owner_key";
const toUser = (row: UserRow): User => ({ id: row.id, email: row.email, ownerKey: row.owner_key });

export interface NewUser {
  id: string;
  email: string;
  googleSub: string;
  name: string;
  ownerKey: string;
  createdAt: number;
}

export const userModel = {
  async findBySessionHash(db: D1Database, tokenHash: string): Promise<User | null> {
    const row = await db
      .prepare(`SELECT ${COLUMNS} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`)
      .bind(tokenHash)
      .first<UserRow>();
    return row ? toUser(row) : null;
  },

  /** Matches by Google account id first, then by email (accounts created before Google sign-in). */
  async findForGoogle(db: D1Database, googleSub: string, email: string): Promise<(User & { googleSub: string | null }) | null> {
    const row = await db
      .prepare(`SELECT ${COLUMNS}, u.google_sub FROM users u WHERE u.google_sub = ? OR u.email = ? ORDER BY u.google_sub = ? DESC LIMIT 1`)
      .bind(googleSub, email, googleSub)
      .first<UserRow & { google_sub: string | null }>();
    return row ? { ...toUser(row), googleSub: row.google_sub } : null;
  },

  async linkGoogle(db: D1Database, userId: string, googleSub: string, name: string): Promise<void> {
    await db.prepare("UPDATE users SET google_sub = ?, name = ? WHERE id = ?").bind(googleSub, name, userId).run();
  },

  async insert(db: D1Database, user: NewUser): Promise<void> {
    // api_token_hash is a legacy column (see migration 0002); it only needs a unique placeholder.
    await db
      .prepare(
        "INSERT INTO users (id, email, google_sub, name, owner_key, created_at, api_token_hash) VALUES (?, ?, ?, ?, ?, ?, 'unused:' || ?)",
      )
      .bind(user.id, user.email, user.googleSub, user.name, user.ownerKey, user.createdAt, user.id)
      .run();
  },
};
