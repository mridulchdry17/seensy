// Plain-language text for the app: who an email went to, what happened, when.

/** @typedef {import("../../../../../shared/contracts").BoardEmail} BoardEmail */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapes text for HTML. Every value that came from an email goes through this. */
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

const FREE_MAIL = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|proton|protonmail|aol|zoho|yandex|gmx|rediffmail)\./i;

/** "Kitelabs" for priya@kitelabs.co; the person's name part for personal addresses. */
export function companyOf(address) {
  const [local = "", domain = ""] = String(address).split("@");
  const base = FREE_MAIL.test(domain) || !domain ? local : domain.split(".").slice(-2)[0] ?? domain;
  const cleaned = base.replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : address;
}

export const initial = (text) => (String(text).trim().charAt(0) || "?").toUpperCase();

/** @param {BoardEmail} email */
export const companyOfEmail = (email) => companyOf(email.recipients[0] ?? "");

export function recipientsText(recipients) {
  const [first = "", ...rest] = recipients;
  return rest.length ? `${first} +${rest.length}` : first;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function ago(at, now = Date.now()) {
  const diff = Math.max(0, now - at);
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return dateShort(at);
}

export const dateShort = (at) => new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const timeShort = (at) => new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
export const dayHeading = (at) => new Date(at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export const SIGNAL_TEXT = { hot: "hot", warm: "warm", seen: "✓✓ seen", none: "no signal" };
export const STAGE_TEXT = { replied: "Replied", interview: "Interview", offer: "Offer", closed: "Closed" };

/** The label shown on a row: the user's stage wins over the computed signal. */
export function tagHtml(email) {
  if (email.stage) return `<span class="tag t-stage">${esc(STAGE_TEXT[email.stage])}</span>`;
  return `<span class="tag t-${email.signal}">${SIGNAL_TEXT[email.signal]}</span>`;
}

const clickText = (click) => `“${click.label}”${click.count > 1 ? ` ×${click.count}` : ""}`;

/** Facts, never opinions: "opened on 3 days · clicked “Résumé” · last 2h ago". */
export function factsText(email, now = Date.now()) {
  if (email.lastActivityAt === null) return `✓ sent · ${ago(email.sentAt, now)}`;
  const parts = [];
  if (email.openDays > 1) parts.push(`opened on ${email.openDays} days`);
  else parts.push(email.visits > 1 ? `opened ${email.visits} times` : "opened");
  if (email.clicks.length) parts.push(`clicked ${email.clicks.map(clickText).join(", ")}`);
  parts.push(`last ${ago(email.lastActivityAt, now)}`);
  return `✓✓ ${parts.join(" · ")}`;
}

/** Why an email is Hot or Warm, in one line the user can check against the timeline. */
export function whyText(email) {
  const lead = email.signal === "hot" ? "One of your most active emails right now." : "More active than most of your emails.";
  const detail = [];
  if (email.openDays > 1) detail.push(`came back on ${email.openDays} different days`);
  if (email.clicks.length) detail.push(`clicked ${email.clicks.map((c) => `“${c.label}”`).join(" and ")}`);
  if (!detail.length) detail.push(email.visits > 1 ? `opened ${email.visits} times` : "opened it recently");
  const sentence = detail.join(" and ");
  return `${lead} They ${sentence}.`;
}

/** Opens the email's thread in Gmail, in the right account. */
export function gmailUrl(email, account) {
  const base = `https://mail.google.com/mail/?authuser=${encodeURIComponent(account)}`;
  if (email.threadId) return `${base}#all/${encodeURIComponent(email.threadId)}`;
  return `${base}#search/${encodeURIComponent(`to:${email.recipients[0] ?? ""} subject:"${email.subject}"`)}`;
}
