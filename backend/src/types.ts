export interface Env {
  DB: D1Database;
  /** OAuth client ID of the Seensy Google Cloud project (empty until configured). */
  GOOGLE_CLIENT_ID: string;
}

export interface User {
  id: string;
  email: string;
  ownerKey: string;
}

export interface RequestContext {
  request: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  waitUntil(promise: Promise<unknown>): void;
}

export type Handler = (ctx: RequestContext) => Promise<Response>;

/** What we record about the client behind a pixel load or click. */
export interface HitMeta {
  at: number;
  ua: string;
  country: string;
}
