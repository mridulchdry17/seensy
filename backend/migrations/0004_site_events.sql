-- Anonymous website events (button clicks, sections reached, sign-ups). No personal data:
-- an event name, the page path, the referring site's host and the time.
CREATE TABLE site_events (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  ref  TEXT NOT NULL DEFAULT '',
  at   INTEGER NOT NULL
);
CREATE INDEX idx_site_events_name_at ON site_events (name, at);
