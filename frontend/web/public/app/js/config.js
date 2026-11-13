// Which backend this copy of the site talks to: production on seensy.vercel.app, staging
// everywhere else (the staging site and local testing), so testing never touches real data.
const PRODUCTION_HOST = "seensy.vercel.app";

export const API_BASE =
  location.hostname === PRODUCTION_HOST
    ? "https://seensy-api.mridulchdry.workers.dev"
    : "https://seensy-api-staging.mridulchdry.workers.dev";

/** Must match GOOGLE_CLIENT_ID in backend/wrangler.toml and the extension's config.ts. */
export const GOOGLE_CLIENT_ID = "81064856949-r3cb11tggrcg4v42qhpvo7fo4iqgq25t.apps.googleusercontent.com";

/** Chrome Web Store build, then the fixed unpacked (developer) build. */
export const EXTENSION_IDS = ["nodobfljmmckenohjmnncmokokgocecd", "dkhlnebppjkpdpmcfbjmadnjmlgfkeha"];

export const STORE_URL = "https://chromewebstore.google.com/detail/nodobfljmmckenohjmnncmokokgocecd";
