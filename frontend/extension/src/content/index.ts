// Runs inside mail.google.com.
import * as InboxSDKLoader from "@inboxsdk/core";
import { INBOXSDK_APP_ID } from "../config";
import { setupComposeTracking } from "./compose-tracking";
import { setupOwnViewGuard } from "./own-view-guard";
import { setupSentTicks } from "./sent-ticks";

InboxSDKLoader.load(2, INBOXSDK_APP_ID).then(
  (sdk) => {
    setupComposeTracking(sdk);
    setupOwnViewGuard(sdk);
    setupSentTicks(sdk);
  },
  (error: unknown) => console.error("Seensy could not start in Gmail", error),
);
