import type { AppMessage, MessageMap, MessageType } from "../shared/messages";
import { saveSettings } from "../shared/settings";
import { ApiClient } from "./api-client";
import { enqueue, flush } from "./outbox";
import { clearOwnerCookie, setOwnerCookie } from "./owner-cookie";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Handlers = { [K in MessageType]: (message: AppMessage<K>) => Promise<MessageMap[K]["result"]> };

const handlers: Handlers = {
  "account.connect": async ({ apiToken }) => {
    const token = apiToken.trim();
    const me = await new ApiClient(token).me();
    await saveSettings({ apiToken: token, accountEmail: me.email });
    await setOwnerCookie(me.ownerKey);
    void flush();
    return { email: me.email };
  },

  "account.disconnect": async () => {
    await saveSettings({ apiToken: "", accountEmail: "" });
    await clearOwnerCookie();
    return null;
  },

  "email.register": async ({ body }) => {
    await enqueue({ kind: "register", body });
    return null;
  },

  "email.attachThread": async ({ tid, threadId }) => {
    await enqueue({ kind: "thread", tid, threadId });
    return null;
  },

  "selfView.record": async ({ body }) => {
    await enqueue({ kind: "selfView", body });
    return null;
  },

  "emails.byThreads": async ({ threadIds }) => (await ApiClient.fromSettings()).emailsByThreads(threadIds),

  "activity.recent": async () => (await ApiClient.fromSettings()).activity(Date.now() - WEEK_MS),
};

export function handleMessage(message: AppMessage): Promise<unknown> {
  const handler = handlers[message.type] as (message: AppMessage) => Promise<unknown>;
  return handler(message);
}
