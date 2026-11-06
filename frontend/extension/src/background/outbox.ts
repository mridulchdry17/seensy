// Durable, ordered queue for writes to the API. An email is already sent when we register it,
// so the call must survive offline moments and service-worker restarts.
import type { RegisterEmailRequest, SelfViewRequest } from "../../../../shared/contracts";
import { ApiClient, ApiError } from "./api-client";

export type OutboxJob =
  | { kind: "register"; body: RegisterEmailRequest }
  | { kind: "thread"; tid: string; threadId: string }
  | { kind: "selfView"; body: SelfViewRequest };

interface Entry {
  id: string;
  job: OutboxJob;
  attempts: number;
}

const STORAGE_KEY = "outbox";
const MAX_ATTEMPTS = 30;

async function load(): Promise<Entry[]> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as Entry[] | undefined) ?? [];
}

// Serialise every read-modify-write so concurrent enqueues and flushes never lose entries.
let storageChain: Promise<unknown> = Promise.resolve();
function update(change: (entries: Entry[]) => Entry[]): Promise<void> {
  const next = storageChain.then(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: change(await load()) });
  });
  storageChain = next.catch(() => undefined);
  return next;
}

function perform(api: ApiClient, job: OutboxJob): Promise<void> {
  switch (job.kind) {
    case "register":
      return api.registerEmail(job.body);
    case "thread":
      return api.attachThread(job.tid, job.threadId);
    case "selfView":
      return api.recordSelfView(job.body);
  }
}

/** Bad input never succeeds on retry. 404 can be a register still queued ahead, so it retries. */
const isPermanentFailure = (error: unknown) =>
  error instanceof ApiError && (error.status === 400 || error.status === 403 || error.status === 409);

let flushing: Promise<void> | null = null;

async function drain(): Promise<void> {
  let api: ApiClient;
  try {
    api = await ApiClient.fromSettings();
  } catch {
    return; // not connected yet; jobs wait
  }
  for (const entry of await load()) {
    try {
      await perform(api, entry.job);
      await update((entries) => entries.filter((e) => e.id !== entry.id));
    } catch (error) {
      const giveUp = isPermanentFailure(error) || entry.attempts + 1 >= MAX_ATTEMPTS;
      if (giveUp) console.warn("Seensy dropped a queued call", entry.job.kind, error);
      await update((entries) =>
        giveUp
          ? entries.filter((e) => e.id !== entry.id)
          : entries.map((e) => (e.id === entry.id ? { ...e, attempts: e.attempts + 1 } : e)),
      );
      if (!giveUp) return; // keep order: later jobs may depend on this one
    }
  }
}

export function flush(): Promise<void> {
  flushing ??= drain().finally(() => {
    flushing = null;
  });
  return flushing;
}

export async function enqueue(job: OutboxJob): Promise<void> {
  await update((entries) => [...entries, { id: crypto.randomUUID(), job, attempts: 0 }]);
  void flush();
}
