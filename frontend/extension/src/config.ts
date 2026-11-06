/** Base URL of the seensy-api Worker (tracking pixels, click redirects and the extension API). */
export const API_BASE = "https://seensy-api.mridulchdry.workers.dev";

/**
 * InboxSDK app ID. Register a free app at https://www.inboxsdk.com/register
 * and paste the ID here (it looks like "sdk_seensy_0123456789").
 */
export const INBOXSDK_APP_ID = "sdk_REPLACE_ME";

/** How often the background worker retries queued calls and checks for new opens. */
export const POLL_MINUTES = 1;
