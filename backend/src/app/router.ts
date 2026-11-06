import type { Handler } from "../types";

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

export interface RouteMatch {
  handler: Handler;
  params: Record<string, string>;
}

/** Minimal method + path router on the platform's URLPattern. */
export class Router {
  readonly #routes: Route[] = [];

  on(method: string, pathname: string, handler: Handler): this {
    this.#routes.push({ method, pattern: new URLPattern({ pathname }), handler });
    return this;
  }

  match(method: string, url: URL): RouteMatch | null {
    for (const route of this.#routes) {
      if (route.method !== method) continue;
      const result = route.pattern.exec(url);
      if (result) {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.pathname.groups)) {
          if (value !== undefined) params[key] = value;
        }
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}
