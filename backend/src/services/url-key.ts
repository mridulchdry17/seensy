/**
 * The part of a URL that identifies "the same link": host without www, path without a trailing
 * slash, lower-cased. Protocol, query and fragment are ignored, so a résumé link shared with
 * `?usp=sharing` still matches the saved one. Returns null for anything that isn't an http(s) URL.
 */
export function urlKey(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
  return host + path;
}
