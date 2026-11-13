-- Web app board: a stage the user sets on each email, and the user's own links
-- (résumé, LinkedIn, ...) so clicks on them get the user's name for them.
-- Additive only: the extension and existing routes keep working unchanged.

ALTER TABLE emails ADD COLUMN stage TEXT CHECK (stage IN ('replied', 'interview', 'offer', 'closed'));

CREATE TABLE user_links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,              -- what the user calls it, e.g. "Résumé"
  url_key    TEXT NOT NULL,              -- normalised URL used for matching (see services/url-key.ts)
  url        TEXT NOT NULL,              -- the URL as the user typed it
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, url_key)
);
