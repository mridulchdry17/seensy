import type { ActivityItem } from "../../../shared/contracts";
import { eventModel } from "../models/event.model";
import { userLinkModel } from "../models/user-link.model";
import type { User } from "../types";
import { linkNamer } from "./user-link.service";

const FEED_LIMIT = 50;

export const activityService = {
  /** Opens and clicks by real people since `since`, newest first. */
  async recent(db: D1Database, user: User, since: number): Promise<ActivityItem[]> {
    const [rows, saved] = await Promise.all([eventModel.personActivity(db, user.id, since, FEED_LIMIT), userLinkModel.list(db, user.id)]);
    const nameOf = linkNamer(saved);
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      at: row.at,
      tid: row.tid,
      subject: row.subject,
      recipients: JSON.parse(row.recipients) as string[],
      link: row.url !== null && row.label !== null && row.kind !== null ? { label: nameOf(row.url, row.label), kind: row.kind } : null,
    }));
  },
};
