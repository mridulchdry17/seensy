import { OWNER_COOKIE, OWNER_KEY_SEPARATOR } from "../../../../shared/contracts";
import { API_BASE } from "../config";
import { getSettings } from "../shared/settings";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

/**
 * Keeps the owner cookie in step with the signed-in accounts, so the tracker recognises
 * clicks on any of your own links in this browser and skips them.
 */
export async function syncOwnerCookie(): Promise<void> {
  const keys = Object.values((await getSettings()).accounts).map((a) => a.ownerKey);
  if (keys.length === 0) {
    await chrome.cookies.remove({ url: API_BASE, name: OWNER_COOKIE });
    return;
  }
  await chrome.cookies.set({
    url: API_BASE,
    name: OWNER_COOKIE,
    value: keys.join(OWNER_KEY_SEPARATOR),
    secure: true,
    httpOnly: true,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + ONE_YEAR_S,
  });
}
