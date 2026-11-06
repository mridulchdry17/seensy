export interface Env {
  DB: D1Database;
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
