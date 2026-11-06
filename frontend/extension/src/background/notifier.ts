import type { ActivityItem } from "../../../../shared/contracts";
import { describeActivity } from "../shared/format";
import { ApiClient } from "./api-client";

const LAST_SEEN_KEY = "activityLastSeen";
/** Never pop more than this many notifications at once (e.g. after the laptop wakes up). */
const MAX_NOTIFICATIONS = 5;

/** Opens and clicks by real people across every signed-in account, newest first. */
export async function activitySince(since: number): Promise<ActivityItem[]> {
  const perAccount = await Promise.all((await ApiClient.all()).map((api) => api.activity(since)));
  return perAccount.flat().sort((a, b) => b.at - a.at);
}

/** Shows a desktop notification for each new open or click since the last check. */
export async function notifyNewActivity(): Promise<void> {
  const stored = await chrome.storage.local.get(LAST_SEEN_KEY);
  const lastSeen = stored[LAST_SEEN_KEY] as number | undefined;
  if (lastSeen === undefined) {
    // First run: start from now instead of replaying history.
    await chrome.storage.local.set({ [LAST_SEEN_KEY]: Date.now() });
    return;
  }

  const items = await activitySince(lastSeen);
  if (items.length === 0) return;

  for (const item of items.slice(0, MAX_NOTIFICATIONS).reverse()) {
    chrome.notifications.create(`seensy-${item.id}`, {
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: describeActivity(item),
      message: item.subject || "(no subject)",
    });
  }
  await chrome.storage.local.set({ [LAST_SEEN_KEY]: Math.max(...items.map((i) => i.at)) });
}
