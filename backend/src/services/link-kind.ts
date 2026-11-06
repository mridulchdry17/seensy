const KNOWN_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)(drive|docs)\.google\.com$/, "Google Drive"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)(calendly|cal)\.com$/, "Calendar"],
  [/(^|\.)notion\.(so|site)$/, "Notion"],
  [/(^|\.)dropbox\.com$/, "Dropbox"],
  [/(^|\.)(behance\.net|dribbble\.com)$/, "Portfolio"],
  [/(^|\.)(youtube\.com|youtu\.be|loom\.com)$/, "Video"],
];

/** Human name for where a link goes, e.g. "Google Drive". Unknown hosts return the bare domain. */
export function linkKind(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Link";
  }
  for (const [pattern, kind] of KNOWN_HOSTS) {
    if (pattern.test(host)) return kind;
  }
  return host.replace(/^www\./, "");
}

/** What the UI calls a link: the text the sender wrote, else where it goes. */
export function linkLabel(text: string, url: string): string {
  const trimmed = text.trim();
  return trimmed || linkKind(url);
}
