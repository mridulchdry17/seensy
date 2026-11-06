// Single source of truth for everything the backend and the extension must agree on.

/** Tracking IDs (emails and links) are 12 lowercase base-36 characters, generated client-side. */
export const ID_LENGTH = 12;
export const ID_PATTERN = /^[a-z0-9]{12}$/;

/**
 * Cookie the extension sets on the API domain so the owner's own clicks are recognised.
 * Holds the owner keys of every account signed in on this browser, joined by OWNER_KEY_SEPARATOR.
 */
export const OWNER_COOKIE = "sl_owner";
export const OWNER_KEY_SEPARATOR = ".";

/** Public tracking paths, relative to the API base URL. */
export const trackingPaths = {
  pixel: (tid: string) => `/o/${tid}.gif`,
  click: (lid: string) => `/c/${lid}`,
} as const;

/** Matches a pixel URL anywhere in a string (Gmail keeps the original URL after `#`). */
export const PIXEL_ID_IN_URL = /\/o\/([a-z0-9]{12})\.gif/;

export type Verdict = "person" | "self" | "early" | "scanner";
export type EventType = "open" | "click";

export interface TrackedLinkInput {
  lid: string;
  url: string;
  /** Visible link text, e.g. "Résumé". Empty when the text was the URL itself. */
  label: string;
}

export interface RegisterEmailRequest {
  tid: string;
  subject: string;
  recipients: string[];
  links: TrackedLinkInput[];
}

export interface AttachThreadRequest {
  threadId: string;
}

export interface SelfViewRequest {
  tid: string;
  /** Client time (ms) the owner saw the email; the server clamps it to the last 10 minutes. */
  at: number;
}

export interface LinkClickSummary {
  label: string;
  kind: string;
  count: number;
}

export interface EmailSummary {
  tid: string;
  subject: string;
  recipients: string[];
  sentAt: number;
  threadId: string | null;
  /** Opens judged `person`. */
  opens: number;
  /** Opens or clicks judged `early` (shown separately; may be a scanner or a fast reader). */
  early: number;
  lastOpenedAt: number | null;
  clicks: LinkClickSummary[];
}

export interface ActivityItem {
  id: number;
  type: EventType;
  at: number;
  tid: string;
  subject: string;
  recipients: string[];
  /** Set for clicks. */
  link: { label: string; kind: string } | null;
}

export interface GoogleSignInRequest {
  /** Google ID token (JWT) from the OAuth implicit flow. */
  idToken: string;
  /** The nonce the extension put in the auth request; must match the token's nonce claim. */
  nonce: string;
}

export interface SignInResponse {
  /** Session token for `Authorization: Bearer`. Shown once; store it. */
  token: string;
  email: string;
  name: string;
  ownerKey: string;
}

export interface MeResponse {
  email: string;
  ownerKey: string;
}

export interface WaitlistRequest {
  email: string;
  /** Which part of the website the sign-up came from. */
  source?: string;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}
