// Service worker: answers messages from Gmail and the popup, retries queued calls, notifies on activity.
import "@inboxsdk/core/background.js";
import { POLL_MINUTES } from "../config";
import { isAppMessage, type Reply } from "../shared/messages";
import { handleMessage } from "./handlers";
import { notifyNewActivity } from "./notifier";
import { flush } from "./outbox";

const POLL_ALARM = "seensy-poll";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (reply: Reply<unknown>) => void) => {
  if (!isAppMessage(message)) return false; // leave InboxSDK's own messages alone
  handleMessage(message).then(
    (data) => sendResponse({ ok: true, data }),
    (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  return true; // reply asynchronously
});

const schedulePolling = () => chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
chrome.runtime.onInstalled.addListener(schedulePolling);
chrome.runtime.onStartup.addListener(schedulePolling);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== POLL_ALARM) return;
  void flush();
  notifyNewActivity().catch((error: unknown) => console.warn("Seensy activity check failed", error));
});
