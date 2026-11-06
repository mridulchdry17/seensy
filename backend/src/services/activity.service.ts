import type { ActivityItem } from "../../../shared/contracts";
import { eventModel } from "../models/event.model";
import type { User } from "../types";

const FEED_LIMIT = 50;

export const activityService = {
  /** Opens and clicks by real people since `since`, newest first. */
  async recent(db: D1Database, user: User, since: number): Promise<ActivityItem[]> {
    const rows = await eventModel.personActivity(db, user.id, since, FEED_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      at: row.at,
      tid: row.tid,
      subject: row.subject,
      recipients: JSON.parse(row.recipients) as string[],
      link: row.label !== null && row.kind !== null ? { label: row.label, kind: row.kind } : null,
    }));
  },
};
