-- Early-access sign-ups from the website.
CREATE TABLE waitlist (
  email      TEXT PRIMARY KEY,
  source     TEXT NOT NULL DEFAULT '',   -- where on the site they signed up, e.g. "hero"
  created_at INTEGER NOT NULL
);
