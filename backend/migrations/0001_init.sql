-- Seensy schema v1. All timestamps are epoch milliseconds (UTC).

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  api_token_hash TEXT NOT NULL UNIQUE,   -- sha-256 hex of the bearer token
  owner_key      TEXT NOT NULL UNIQUE,   -- value of the owner cookie (not a secret credential)
  created_at     INTEGER NOT NULL
);

CREATE TABLE emails (
  tid        TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  subject    TEXT NOT NULL,
  recipients TEXT NOT NULL,              -- JSON array of addresses
  thread_id  TEXT,                       -- Gmail thread id, attached after send
  sent_at    INTEGER NOT NULL
);
CREATE INDEX idx_emails_user_sent ON emails (user_id, sent_at DESC);
CREATE INDEX idx_emails_user_thread ON emails (user_id, thread_id);

CREATE TABLE links (
  lid       TEXT PRIMARY KEY,
  email_tid TEXT NOT NULL REFERENCES emails(tid),
  url       TEXT NOT NULL,
  label     TEXT NOT NULL,
  kind      TEXT NOT NULL                -- "Google Drive", "LinkedIn", ... derived from the URL
);
CREATE INDEX idx_links_email ON links (email_tid);

CREATE TABLE events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  type    TEXT NOT NULL CHECK (type IN ('open', 'click')),
  tid     TEXT NOT NULL,                 -- no FK: a hit may arrive before the email is registered
  lid     TEXT,
  at      INTEGER NOT NULL,
  ua      TEXT NOT NULL,
  country TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('person', 'self', 'early', 'scanner'))
);
CREATE INDEX idx_events_tid_at ON events (tid, at);

CREATE TABLE self_views (
  tid TEXT NOT NULL,
  at  INTEGER NOT NULL
);
CREATE INDEX idx_self_views_tid_at ON self_views (tid, at);
