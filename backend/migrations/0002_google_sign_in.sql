-- Google sign-in: users are identified by their Google account; each signed-in device gets
-- its own session token.
--
-- users.api_token_hash (from 0001) is no longer read. D1 can't drop a UNIQUE column or rebuild
-- a table that other tables reference, so it stays; new users get a non-secret placeholder.

ALTER TABLE users ADD COLUMN google_sub TEXT;   -- Google's stable account id; null until first sign-in
ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX idx_users_google_sub ON users (google_sub);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,           -- sha-256 hex of the bearer token
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- Keep existing tokens working as sessions.
INSERT INTO sessions (token_hash, user_id, created_at) SELECT api_token_hash, id, created_at FROM users;
