// Durable, ordered queue for writes to the API. An email is already sent when we register it,
// so the call must survive offline moments and service-worker restarts.
import type { RegisterEmailRequest, SelfViewRequest } from "../../../../shared/contracts";
import { ApiClient, ApiError, NotSignedInError } from "./api-client";

export type OutboxJob =
  | { kind: "register"; account: string; body: RegisterEmailRequest }
  | { kind: "thread"; account: string; tid: string; threadId: string }
  /** No account: you may read your own email from another of your signed-in Gmail accounts. */
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

/** Records the self-view with whichever signed-in account owns the email. */
async function recordSelfView(body: SelfViewRequest): Promise<void> {
  for (const api of await ApiClient.all()) {
    try {
      return await api.recordSelfView(body);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
  throw new ApiError(404, "None of your signed-in accounts sent this email.");
}

async function perform(job: OutboxJob): Promise<void> {
  switch (job.kind) {
    case "register":
      return (await ApiClient.forAccount(job.account)).registerEmail(job.body);
    case "thread":
      return (await ApiClient.forAccount(job.account)).attachThread(job.tid, job.threadId);
    case "selfView":
      return recordSelfView(job.body);
  }
}

/**
 * Never succeeds on retry: bad input, signed out, or (for self-views) not our email.
 * A 404 on "thread" can be its register still queued ahead, so that one retries.
 */
function isPermanentFailure(job: OutboxJob, error: unknown): boolean {
  if (error instanceof NotSignedInError) return true;
  if (!(error instanceof ApiError)) return false;
  return [400, 403, 409].includes(error.status) || (error.status === 404 && job.kind === "selfView");
}

async function drain(): Promise<void> {
  for (const entry of await load()) {
    try {
      await perform(entry.job);
      await update((entries) => entries.filter((e) => e.id !== entry.id));
    } catch (error) {
      const giveUp = isPermanentFailure(entry.job, error) || entry.attempts + 1 >= MAX_ATTEMPTS;
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

let flushing: Promise<void> | null = null;

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
