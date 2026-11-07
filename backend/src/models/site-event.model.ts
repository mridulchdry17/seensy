export interface NewSiteEvent {
  name: string;
  path: string;
  ref: string;
  at: number;
}

export const siteEventModel = {
  async insert(db: D1Database, event: NewSiteEvent): Promise<void> {
    await db
      .prepare("INSERT INTO site_events (name, path, ref, at) VALUES (?, ?, ?, ?)")
      .bind(event.name, event.path, event.ref, event.at)
      .run();
  },
};
