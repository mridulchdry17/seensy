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

export interface Hit {
  at: number;
  ua: string;
  /** Null when the hit arrives before the email is registered. */
  sentAt: number | null;
}

function baseVerdict(hit: Hit): Verdict {
  if (SCANNER_UA.test(hit.ua)) return "scanner";
  if (hit.sentAt !== null && hit.at - hit.sentAt < EARLY_WINDOW_MS) return "early";
  return "person";
}

export function classifyOpen(hit: Hit, ownerViewedNearby: boolean): Verdict {
  return ownerViewedNearby ? "self" : baseVerdict(hit);
}

export function classifyClick(hit: Hit, clickedByOwner: boolean, partOfBurst: boolean): Verdict {
  if (clickedByOwner) return "self";
  if (partOfBurst) return "scanner";
  return baseVerdict(hit);
}
