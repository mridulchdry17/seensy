// CORS for the Seensy website. The extension doesn't need it (host permissions);
// only browser pages on WEB_ORIGINS may call the API cross-origin.

function allowedOrigin(request: Request, webOrigins: string): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return webOrigins
    .split(",")
    .map((o) => o.trim())
    .includes(origin)
    ? origin
    : null;
}

/** Answers a CORS preflight for an allowed origin, or returns null to let routing continue. */
export function preflight(request: Request, webOrigins: string): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = allowedOrigin(request, webOrigins);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-max-age": "86400",
      vary: "origin",
    },
  });
}

/** Adds CORS headers to a response when the request came from an allowed website origin. */
export function withCors(request: Request, response: Response, webOrigins: string): Response {
  const origin = allowedOrigin(request, webOrigins);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.append("vary", "origin");
  return new Response(response.body, { status: response.status, headers });
}
