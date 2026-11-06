// Adds the Seensy on/off switch to every compose window and instruments the email on Send.
import type { ComposeButtonDescriptor } from "@inboxsdk/core";
import Kefir, { type Emitter } from "kefir";
import { API_BASE } from "../config";
import { newTrackingId } from "../shared/ids";
import { sendMessage } from "../shared/messages";
import { getSettings } from "../shared/settings";
import { instrumentEmailBody } from "./instrument";
import type { ComposeView, InboxSDK } from "./sdk-types";

const icon = (on: boolean) => chrome.runtime.getURL(on ? "icons/track-on.svg" : "icons/track-off.svg");

function recipientsOf(compose: ComposeView): string[] {
  const all = [...compose.getToRecipients(), ...compose.getCcRecipients(), ...compose.getBccRecipients()];
  return [...new Set(all.map((c) => c.emailAddress.trim().toLowerCase()))];
}

async function attachTracking(compose: ComposeView): Promise<void> {
  const { apiToken, trackByDefault } = await getSettings();
  const connected = Boolean(apiToken);
  let enabled = connected && trackByDefault;

  // The button is a live stream so the icon and title update in place when toggled.
  let emitter: Emitter<ComposeButtonDescriptor, never> | undefined;
  const describe = (): ComposeButtonDescriptor => ({
    title: enabled ? "Seensy: tracking on" : "Seensy: tracking off",
    tooltip: enabled ? "Opens and link clicks will be tracked" : "This email won't be tracked",
    iconUrl: icon(enabled),
    type: "MODIFIER",
    orderHint: 1,
    onClick: () => {
      if (!connected) {
        button.showTooltip({
          title: "Connect Seensy first",
          subtitle: "Click the Seensy icon in Chrome's toolbar and paste your API token.",
        });
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
    attachTracking(compose).catch((error: unknown) => console.error("Seensy: compose setup failed", error));
  });
}
