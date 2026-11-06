// Typed messages between Gmail/popup (senders) and the background worker (the only API caller).
import type {
  ActivityItem,
  EmailSummary,
  RegisterEmailRequest,
  SelfViewRequest,
} from "../../../../shared/contracts";

type NoPayload = Record<string, never>;

export interface MessageMap {
  "account.connect": { payload: { apiToken: string }; result: { email: string } };
  "account.disconnect": { payload: NoPayload; result: null };
  "email.register": { payload: { body: RegisterEmailRequest }; result: null };
  "email.attachThread": { payload: { tid: string; threadId: string }; result: null };
  "selfView.record": { payload: { body: SelfViewRequest }; result: null };
  "emails.byThreads": { payload: { threadIds: string[] }; result: EmailSummary[] };
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
