import { OWNER_COOKIE } from "../../../../shared/contracts";
import { API_BASE } from "../config";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

/** Lets the tracker recognise clicks on your own links in this browser and skip them. */
export async function setOwnerCookie(ownerKey: string): Promise<void> {
  await chrome.cookies.set({
    url: API_BASE,
    name: OWNER_COOKIE,
    value: ownerKey,
    secure: true,
    httpOnly: true,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + ONE_YEAR_S,
  });
}

export async function clearOwnerCookie(): Promise<void> {
  await chrome.cookies.remove({ url: API_BASE, name: OWNER_COOKIE });
}
