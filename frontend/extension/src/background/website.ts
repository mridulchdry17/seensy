// Answers the Seensy web app (only pages listed under "externally_connectable" can ask):
// "is the extension here, and which Gmail accounts are signed in?" Nothing else is exposed.
import { getSettings } from "../shared/settings";

export interface WebsitePing {
  version: string;
  accounts: string[];
}

export async function answerWebsite(message: unknown, sender: chrome.runtime.MessageSender): Promise<WebsitePing | null> {
  const isPing = typeof message === "object" && message !== null && (message as { type?: unknown }).type === "ping";
  if (!isPing || !sender.url) return null;
  const { accounts } = await getSettings();
  return { version: chrome.runtime.getManifest().version, accounts: Object.keys(accounts) };
}
