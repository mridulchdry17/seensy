// When you read one of your own tracked emails in Gmail, remove its pixel and tell the API
// it was you, so the open is never counted as the recipient's.
import { API_BASE } from "../config";
import { sendMessage } from "../shared/messages";
import { findOwnPixels } from "./instrument";
import type { InboxSDK, MessageView } from "./sdk-types";

function guard(view: MessageView): void {
  const reported = new Set<string>();
  const scan = () => {
    for (const { img, tid } of findOwnPixels(view.getBodyElement(), API_BASE)) {
      img.remove();
      if (reported.has(tid)) continue;
      reported.add(tid);
      sendMessage("selfView.record", { body: { tid, at: Date.now() } }).catch((error: unknown) =>
        console.warn("Seensy: self-view not recorded", error),
      );
    }
  };

  scan();
  // Collapsed messages fill their body later; watch until the view goes away.
  const observer = new MutationObserver(scan);
  observer.observe(view.getBodyElement(), { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  view.on("destroy", () => observer.disconnect());
}

export function setupOwnViewGuard(sdk: InboxSDK): void {
  sdk.Conversations.registerMessageViewHandler(guard);
}
