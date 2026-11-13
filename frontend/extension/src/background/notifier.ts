import type { ActivityItem } from "../../../../shared/contracts";
import { describeActivity } from "../shared/format";
import { ApiClient } from "./api-client";

const LAST_SEEN_KEY = "activityLastSeen";
const NOTIFIED_KEY = "activityNotifiedIds";
/** Never pop more than this many notifications at once (e.g. after the laptop wakes up). */
const MAX_NOTIFICATIONS = 5;
/**
 * Each check also looks this far back before the last one. An open is stamped when the pixel
 * loads but saved a moment later, so it can land just behind the previous check; the overlap
 * catches it, and NOTIFIED_KEY stops anything being announced twice.
 */
const OVERLAP_MS = 10 * 60_000;
/** How many announced event IDs to remember (far more than one overlap window holds). */
const NOTIFIED_MEMORY = 200;

/** Opens and clicks by real people across every signed-in account, newest first. */
export async function activitySince(since: number): Promise<ActivityItem[]> {
  const perAccount = await Promise.all((await ApiClient.all()).map((api) => api.activity(since)));
  return perAccount.flat().sort((a, b) => b.at - a.at);
}

/** Starts notifications from now (called on install) instead of replaying history. */
export async function startActivityWatch(): Promise<void> {
  const stored = await chrome.storage.local.get(LAST_SEEN_KEY);
  if (stored[LAST_SEEN_KEY] === undefined) await chrome.storage.local.set({ [LAST_SEEN_KEY]: Date.now() });
}

/** Shows a desktop notification for each new open or click since the last check. */
export async function notifyNewActivity(): Promise<void> {
  const stored = await chrome.storage.local.get([LAST_SEEN_KEY, NOTIFIED_KEY]);
  const lastSeen = stored[LAST_SEEN_KEY] as number | undefined;
  if (lastSeen === undefined) return startActivityWatch();
  const notified = new Set((stored[NOTIFIED_KEY] as number[] | undefined) ?? []);

  const items = (await activitySince(lastSeen - OVERLAP_MS)).filter((item) => !notified.has(item.id));
  if (items.length === 0) return;

  for (const item of items.slice(0, MAX_NOTIFICATIONS).reverse()) {
    chrome.notifications.create(`seensy-${item.id}`, {
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: describeActivity(item),
      message: item.subject || "(no subject)",
    });
  }
  await chrome.storage.local.set({
    [LAST_SEEN_KEY]: Math.max(lastSeen, ...items.map((i) => i.at)),
    [NOTIFIED_KEY]: [...items.map((i) => i.id), ...notified].slice(0, NOTIFIED_MEMORY),
  });
}
