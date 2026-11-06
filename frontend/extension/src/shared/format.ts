import type { ActivityItem } from "../../../../shared/contracts";

const PERSONAL_MAIL_DOMAIN = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|proton|protonmail)\./i;

/** "pallav@uolo.com" → "Uolo"; personal addresses keep the mailbox name ("rahul@gmail.com" → "rahul"). */
export function senderName(email: string): string {
  const [local = email, domain = ""] = email.split("@");
  if (!domain || PERSONAL_MAIL_DOMAIN.test(domain)) return local;
  const name = domain.split(".")[0] ?? domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function recipientsName(recipients: string[]): string {
  return recipients[0] ? senderName(recipients[0]) : "Someone";
}

export function describeActivity(item: ActivityItem): string {
  const who = recipientsName(item.recipients);
  return item.type === "click" && item.link ? `${who} clicked ${item.link.label}` : `${who} opened your email`;
}

export function timeAgo(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
