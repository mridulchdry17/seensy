// Adds the Seensy on/off switch to every compose window and instruments the email on Send.
import type { ComposeButtonDescriptor } from "@inboxsdk/core";
import Kefir, { type Emitter } from "kefir";
import { API_BASE } from "../config";
import { newTrackingId } from "../shared/ids";
import { sendMessage } from "../shared/messages";
import { getSettings } from "../shared/settings";
import { accountState, type AccountState } from "./account";
import { instrumentEmailBody } from "./instrument";
import type { ComposeView, InboxSDK } from "./sdk-types";

const icon = (on: boolean) => chrome.runtime.getURL(on ? "icons/track-on.svg" : "icons/track-off.svg");

function recipientsOf(compose: ComposeView): string[] {
  const all = [...compose.getToRecipients(), ...compose.getCcRecipients(), ...compose.getBccRecipients()];
  return [...new Set(all.map((c) => c.emailAddress.trim().toLowerCase()))];
}

function unavailableTooltip(account: Exclude<AccountState, { kind: "active" }>): { title: string; subtitle: string } {
  if (account.kind === "disconnected") {
    return {
      title: "Connect Seensy first",
      subtitle: "Click the Seensy icon in Chrome's toolbar and paste your API token.",
    };
  }
  return {
    title: "Seensy isn't tracking this account",
    subtitle: `It's connected to ${account.connectedEmail}. Switch to that Gmail account to track emails.`,
  };
}

async function attachTracking(sdk: InboxSDK, compose: ComposeView): Promise<void> {
  const [account, { trackByDefault }] = await Promise.all([accountState(sdk), getSettings()]);
  let enabled = account.kind === "active" && trackByDefault;

  // The button is a live stream so the icon and title update in place when toggled.
  let emitter: Emitter<ComposeButtonDescriptor, never> | undefined;
  const describe = (): ComposeButtonDescriptor => ({
    title: enabled ? "Seensy: tracking on" : "Seensy: tracking off",
    tooltip: enabled ? "Opens and link clicks will be tracked" : "This email won't be tracked",
    iconUrl: icon(enabled),
    type: "MODIFIER",
    orderHint: 1,
    onClick: () => {
      if (account.kind !== "active") {
        button.showTooltip(unavailableTooltip(account));
        return;
      }
      enabled = !enabled;
      emitter?.emit(describe());
    },
  });
  const button = compose.addButton(
    Kefir.stream<ComposeButtonDescriptor, never>((e) => {
      emitter = e;
      e.emit(describe());
      return () => {
        emitter = undefined;
      };
    }),
  );

  const tid = newTrackingId();
  let instrumented = false;

  compose.on("presending", () => {
    // Gmail can cancel and re-fire presending (e.g. a missing-attachment warning): instrument once.
    if (!enabled || instrumented) return;
    instrumented = true;
    const links = instrumentEmailBody(compose.getBodyElement(), tid, API_BASE, newTrackingId);
    const body = { tid, subject: compose.getSubject().slice(0, 500), recipients: recipientsOf(compose), links };
    sendMessage("email.register", { body }).catch((error: unknown) => console.warn("Seensy: register failed", error));
  });

  compose.on("sent", async (event) => {
    if (!instrumented) return;
    const threadId = await event.getThreadID();
    sendMessage("email.attachThread", { tid, threadId }).catch((error: unknown) =>
      console.warn("Seensy: attaching thread failed", error),
    );
  });
}

export function setupComposeTracking(sdk: InboxSDK): void {
  sdk.Compose.registerComposeViewHandler((compose) => {
    attachTracking(sdk, compose).catch((error: unknown) => console.error("Seensy: compose setup failed", error));
  });
}
