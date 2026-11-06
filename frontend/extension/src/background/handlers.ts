import type { AppMessage, MessageMap, MessageType } from "../shared/messages";
import { getSettings, normaliseEmail, saveSettings } from "../shared/settings";
import { ApiClient, exchangeGoogleToken } from "./api-client";
import { signInWithGoogle } from "./google-auth";
import { activitySince } from "./notifier";
import { enqueue, flush } from "./outbox";
import { syncOwnerCookie } from "./owner-cookie";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Handlers = { [K in MessageType]: (message: AppMessage<K>) => Promise<MessageMap[K]["result"]> };

const handlers: Handlers = {
  "account.signIn": async ({ loginHint }) => {
    const session = await exchangeGoogleToken(await signInWithGoogle(loginHint));
    const { accounts } = await getSettings();
    const email = normaliseEmail(session.email);
    await saveSettings({
      accounts: { ...accounts, [email]: { token: session.token, ownerKey: session.ownerKey, name: session.name } },
    });
    await syncOwnerCookie();
    void flush();
    return { email };
  },

  "account.signOut": async ({ account }) => {
    const { [normaliseEmail(account)]: _removed, ...rest } = (await getSettings()).accounts;
    await saveSettings({ accounts: rest });
    await syncOwnerCookie();
    return null;
  },

  "email.register": async ({ account, body }) => {
    await enqueue({ kind: "register", account, body });
    return null;
  },

  "email.attachThread": async ({ account, tid, threadId }) => {
    await enqueue({ kind: "thread", account, tid, threadId });
    return null;
  },

  "selfView.record": async ({ body }) => {
    await enqueue({ kind: "selfView", body });
    return null;
  },

  "emails.byThreads": async ({ account, threadIds }) => (await ApiClient.forAccount(account)).emailsByThreads(threadIds),

  "activity.recent": () => activitySince(Date.now() - WEEK_MS),
};

export function handleMessage(message: AppMessage): Promise<unknown> {
  const handler = handlers[message.type] as (message: AppMessage) => Promise<unknown>;
  return handler(message);
}
