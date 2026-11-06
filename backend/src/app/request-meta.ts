import type { HitMeta } from "../types";

export function hitMeta(request: Request): HitMeta {
  const cf = request.cf as { country?: string } | undefined;
  return {
    at: Date.now(),
    ua: (request.headers.get("user-agent") ?? "").slice(0, 300),
    country: cf?.country ?? "",
  };
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
