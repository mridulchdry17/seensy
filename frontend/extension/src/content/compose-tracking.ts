// Adds the Seensy on/off switch to every compose window and instruments the email on Send.
import type { ComposeButtonDescriptor } from "@inboxsdk/core";
import Kefir, { type Emitter } from "kefir";
import { API_BASE } from "../config";
import { newTrackingId } from "../shared/ids";
import { sendMessage } from "../shared/messages";
import { getSettings } from "../shared/settings";
import { accountState } from "./account";
import { instrumentEmailBody } from "./instrument";
import type { ComposeView, InboxSDK } from "./sdk-types";

const icon = (on: boolean) => chrome.runtime.getURL(on ? "icons/track-on.svg" : "icons/track-off.svg");
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function recipientsOf(compose: ComposeView): string[] {
  const all = [...compose.getToRecipients(), ...compose.getCcRecipients(), ...compose.getBccRecipients()];
  return [...new Set(all.map((c) => c.emailAddress.trim().toLowerCase()))];
}

async function attachTracking(sdk: InboxSDK, compose: ComposeView): Promise<void> {
  const [account, { trackByDefault }] = await Promise.all([accountState(sdk), getSettings()]);
  let signedIn = account.signedIn;
  let enabled = signedIn && trackByDefault;

  // The button is a live stream so the icon and title update in place.
  let emitter: Emitter<ComposeButtonDescriptor, never> | undefined;
  const refresh = () => emitter?.emit(describe());

  /** Not signed in: clicking the switch signs this Gmail account in with Google, then turns tracking on. */
  async function signInHere(): Promise<void> {
    try {
      const { email } = await sendMessage("account.signIn", { loginHint: account.gmail });
      if (email !== account.gmail) {
        button.showTooltip({
          title: `Signed in as ${email}`,
          subtitle: `This window is ${account.gmail}. Sign in with that Google account to track emails from it.`,
        });
        return;
      }
      signedIn = enabled = true;
      refresh();
    } catch (error) {
      button.showTooltip({ title: "Couldn't sign in to Seensy", subtitle: errorText(error) });
    }
  }

  function describe(): ComposeButtonDescriptor {
    return {
      title: !signedIn ? "Seensy: sign in to track" : enabled ? "Seensy: tracking on" : "Seensy: tracking off",
      tooltip: !signedIn
        ? `Sign in with Google to track emails from ${account.gmail}`
        : enabled
          ? "Opens and link clicks will be tracked"
          : "This email won't be tracked",
      iconUrl: icon(enabled),
      type: "MODIFIER",
      orderHint: 1,
      onClick: () => {
        if (!signedIn) {
          void signInHere();
          return;
        }
        enabled = !enabled;
        refresh();
      },
    };
  }

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
    sendMessage("email.register", { account: account.gmail, body }).catch((error: unknown) =>
      console.warn("Seensy: register failed", error),
    );
  });

  compose.on("sent", async (event) => {
    if (!instrumented) return;
    const threadId = await event.getThreadID();
    sendMessage("email.attachThread", { account: account.gmail, tid, threadId }).catch((error: unknown) =>
      console.warn("Seensy: attaching thread failed", error),
    );
  });
}

export function setupComposeTracking(sdk: InboxSDK): void {
  sdk.Compose.registerComposeViewHandler((compose) => {
    attachTracking(sdk, compose).catch((error: unknown) => console.error("Seensy: compose setup failed", error));
  });
}
