import type { ApiErrorBody } from "../../../shared/contracts";

const NO_STORE = { "cache-control": "no-store, no-cache, must-revalidate, max-age=0" };

/** An error a controller or service throws to produce a specific HTTP status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(error: HttpError): Response {
  const body: ApiErrorBody = { error: error.message };
  if (error.details !== undefined) body.details = error.details;
  return json(body, error.status);
}

export function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location, ...NO_STORE } });
}

const PIXEL_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

export function pixel(): Response {
  return new Response(PIXEL_GIF, { headers: { "content-type": "image/gif", ...NO_STORE } });
}

export function htmlPage(status: number, title: string, message: string): Response {
  const body = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title><body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 16px;color:#14161b">
<h1 style="font-size:22px">${title}</h1><p>${message}</p></body>`;
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...NO_STORE } });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
