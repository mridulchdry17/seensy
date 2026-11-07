import { siteEventModel } from "../models/site-event.model";

export const siteEventService = {
  record(db: D1Database, event: { name: string; path: string; ref: string }): Promise<void> {
    return siteEventModel.insert(db, { ...event, ref: event.ref.toLowerCase(), at: Date.now() });
  },
};
