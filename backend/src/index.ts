import { preflight, withCors } from "./app/cors";
import { HttpError, errorResponse, json } from "./app/http";
import { router } from "./routes";
import type { Env, RequestContext } from "./types";

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const match = router.match(request.method, url);
  if (!match) return json({ error: "Not found." }, 404);

  const context: RequestContext = {
    request,
    env,
    url,
    params: match.params,
    waitUntil: (promise) => ctx.waitUntil(promise),
  };
  try {
    return await match.handler(context);
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error);
    console.error("Unhandled error", request.method, url.pathname, error);
    return json({ error: "Something went wrong on our side. Try again in a minute." }, 500);
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return preflight(request, env.WEB_ORIGINS) ?? withCors(request, await route(request, env, ctx), env.WEB_ORIGINS);
  },
} satisfies ExportedHandler<Env>;
