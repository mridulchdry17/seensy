/** Base URL of the seensy-api Worker (tracking pixels, click redirects and the extension API). */
export const API_BASE = "https://seensy-api.mridulchdry.workers.dev";

/**
 * InboxSDK app ID. Register a free app at https://register.inboxsdk.com
 * and paste the ID here (it looks like "sdk_seensy_0123456789").
 */
export const INBOXSDK_APP_ID = "sdk_Test-seensy_d483fac5e9";

/**
 * OAuth client ID (type "Web application") of the Seensy Google Cloud project. Its authorized
 * redirect URI must be https://<extension-id>.chromiumapp.org/ — the ID is fixed by the
 * manifest "key". Must match GOOGLE_CLIENT_ID in backend/wrangler.toml.
 */
export const GOOGLE_CLIENT_ID = "81064856949-r3cb11tggrcg4v42qhpvo7fo4iqgq25t.apps.googleusercontent.com";

/**
 * How often the background worker retries queued calls and checks for new opens. Every check is
 * one API request per signed-in account, so this sets most of the backend's load: 5 minutes keeps
 * a few hundred daily users inside Cloudflare's free plan.
 */
export const POLL_MINUTES = 5;

/** The Seensy web app (the board). */
export const DASHBOARD_URL = "https://seensy.vercel.app/app";
