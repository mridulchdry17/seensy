// Is the Seensy extension installed in this browser, and which Gmail accounts are signed in?
// The extension answers pages on the Seensy site only (manifest "externally_connectable").
import { EXTENSION_IDS } from "./config.js";

const TIMEOUT_MS = 1500;

function ask(id) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    try {
      chrome.runtime.sendMessage(id, { channel: "seensy", type: "ping" }, (reply) => {
        clearTimeout(timer);
        void chrome.runtime.lastError; // "no such extension" for the ID that isn't installed
        resolve(reply && Array.isArray(reply.accounts) ? reply : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** @returns {Promise<{ accounts: string[], version: string } | null>} null when not installed (or not Chrome). */
export async function detectExtension() {
  if (!globalThis.chrome?.runtime?.sendMessage) return null;
  for (const id of EXTENSION_IDS) {
    const reply = await ask(id);
    if (reply) return reply;
  }
  return null;
}
