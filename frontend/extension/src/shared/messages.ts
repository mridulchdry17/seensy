// Typed messages between Gmail/popup (senders) and the background worker (the only API caller).
import type {
  ActivityItem,
  EmailSummary,
  RegisterEmailRequest,
  SelfViewRequest,
} from "../../../../shared/contracts";

type NoPayload = Record<string, never>;

/** `account` is the Gmail address whose Seensy session should be used. */
export interface MessageMap {
  "account.signIn": { payload: { loginHint?: string }; result: { email: string } };
  "account.signOut": { payload: { account: string }; result: null };
  "email.register": { payload: { account: string; body: RegisterEmailRequest }; result: null };
  "email.attachThread": { payload: { account: string; tid: string; threadId: string }; result: null };
  "selfView.record": { payload: { body: SelfViewRequest }; result: null };
  "emails.byThreads": { payload: { account: string; threadIds: string[] }; result: EmailSummary[] };
  "activity.recent": { payload: NoPayload; result: ActivityItem[] };
}

export type MessageType = keyof MessageMap;

const CHANNEL = "seensy";

export type AppMessage<K extends MessageType = MessageType> = K extends MessageType
  ? { channel: typeof CHANNEL; type: K } & MessageMap[K]["payload"]
  : never;

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string };

export function isAppMessage(value: unknown): value is AppMessage {
  return typeof value === "object" && value !== null && (value as { channel?: unknown }).channel === CHANNEL;
}

export async function sendMessage<K extends MessageType>(
  type: K,
  payload: MessageMap[K]["payload"],
): Promise<MessageMap[K]["result"]> {
  const reply = (await chrome.runtime.sendMessage({ channel: CHANNEL, type, ...payload })) as
    | Reply<MessageMap[K]["result"]>
    | undefined;
  if (!reply) throw new Error("Seensy's background worker didn't respond. Reload the extension.");
  if (!reply.ok) throw new Error(reply.error);
  return reply.data;
}
