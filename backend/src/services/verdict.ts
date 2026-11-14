import type { Verdict } from "../../../shared/contracts";

/** Hits this soon after sending are ambiguous: a mail scanner or a very fast reader. */
export const EARLY_WINDOW_MS = 60_000;
/** An open this close to an owner self-view is the owner's own. */
export const SELF_WINDOW_MS = 20_000;
/** Two different links of one email clicked this close together is a link scanner. */
export const CLICK_BURST_MS = 2_000;

/** Corporate mail security gateways and scripted clients. Gmail's own image proxy is a real reader. */
const SCANNER_UA =
  /barracuda|mimecast|proofpoint|ironport|messagelabs|symantec|trend ?micro|fireeye|zscaler|bingpreview|safelinks|microsoft office protection|python-requests|go-http-client|curl\/|wget\/|headlesschrome/i;

/**
 * Gmail fetches images through its proxy only when a person opens the email, so a proxied open
 * is a reader even seconds after sending (scanners fetch directly, with their own user agent).
 */
const GMAIL_PROXY_UA = /GoogleImageProxy/i;
/**
 * Link scanners run on servers and sometimes pose as a desktop browser, never as a phone. A
 * phone browser's click is a reader even seconds after sending.
 */
const PHONE_BROWSER_UA = /\b(iPhone|iPad|Android)\b/;

export interface Hit {
  at: number;
  ua: string;
  /** Null when the hit arrives before the email is registered (see baseVerdict). */
  sentAt: number | null;
}

/** `trustedEarly`: this kind of hit comes from a person even inside the early window. */
function baseVerdict(hit: Hit, trustedEarly: RegExp): Verdict {
  if (SCANNER_UA.test(hit.ua)) return "scanner";
  // Registration fires the moment Send is clicked, before delivery, so a hit on an unregistered
  // email is the sender's own browser loading the pixel it just inserted. (A registration that
  // arrives late from the retry queue gives older hits back: emailService.register.)
  if (hit.sentAt === null) return "self";
  const early = hit.sentAt !== null && hit.at - hit.sentAt < EARLY_WINDOW_MS;
  return early && !trustedEarly.test(hit.ua) ? "early" : "person";
}

export function classifyOpen(hit: Hit, ownerViewedNearby: boolean): Verdict {
  return ownerViewedNearby ? "self" : baseVerdict(hit, GMAIL_PROXY_UA);
}

export function classifyClick(hit: Hit, clickedByOwner: boolean, partOfBurst: boolean): Verdict {
  if (clickedByOwner) return "self";
  if (partOfBurst) return "scanner";
  return baseVerdict(hit, PHONE_BROWSER_UA);
}
