// Shows "✓ Sent" / "✓✓ 2× · Résumé" next to tracked threads in any Gmail list.
import type { LabelDescriptor } from "@inboxsdk/core";
import type { EmailSummary } from "../../../../shared/contracts";
import { sendMessage } from "../shared/messages";
import { accountState } from "./account";
import { createBatcher } from "./batch";
import type { InboxSDK } from "./sdk-types";

const BATCH_DELAY_MS = 250;

// Design tokens (see CLAUDE.md): accent = opened, muted = sent only.
const OPENED = { foregroundColor: "#1F57F0", backgroundColor: "#E2E9FF" };
const SENT = { foregroundColor: "#5A6070", backgroundColor: "#EEF0F4" };

/** A thread can hold several tracked emails (e.g. a follow-up); show their combined activity. */
export function tickLabel(emails: EmailSummary[]): LabelDescriptor {
  const opens = emails.reduce((sum, e) => sum + e.opens, 0);
  if (opens === 0) return { title: "✓ Sent", ...SENT };
  const clicked = [...new Set(emails.flatMap((e) => e.clicks.map((c) => c.label)))];
  const title = `✓✓ ${opens}×${clicked.length ? ` · ${clicked.join(", ")}` : ""}`;
  return { title, maxWidth: "220px", ...OPENED };
}

async function loadByThread(account: string, threadIds: string[]): Promise<EmailSummary[][]> {
  const summaries = await sendMessage("emails.byThreads", { account, threadIds });
  return threadIds.map((id) => summaries.filter((s) => s.threadId === id));
}

export function setupSentTicks(sdk: InboxSDK): void {
  // A Gmail tab shows one account, so one batcher per tab is enough.
  let lookup: ((threadId: string) => Promise<EmailSummary[]>) | undefined;

  sdk.Lists.registerThreadRowViewHandler(async (row) => {
    try {
      const account = await accountState(sdk);
      if (!account.signedIn) return;
      lookup ??= createBatcher((ids: string[]) => loadByThread(account.gmail, ids), BATCH_DELAY_MS);
      const emails = await lookup(await row.getThreadIDAsync());
      if (emails.length > 0 && !row.destroyed) row.addLabel(tickLabel(emails));
    } catch {
      // Not connected or offline: show no tick rather than a wrong one.
    }
  });
}
