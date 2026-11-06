import type { User } from "../types";

interface UserRow {
  id: string;
  email: string;
  owner_key: string;
}

const toUser = (row: UserRow): User => ({ id: row.id, email: row.email, ownerKey: row.owner_key });

export const userModel = {
  async findByTokenHash(db: D1Database, tokenHash: string): Promise<User | null> {
    const row = await db
      .prepare("SELECT id, email, owner_key FROM users WHERE api_token_hash = ?")
      .bind(tokenHash)
      .first<UserRow>();
    return row ? toUser(row) : null;
  },
};
