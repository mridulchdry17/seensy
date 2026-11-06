import { HttpError, errorResponse, json } from "./app/http";
import { router } from "./routes";
import type { Env } from "./types";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const match = router.match(request.method, url);
    if (!match) return json({ error: "Not found." }, 404);

    try {
      return await match.handler({
        request,
        env,
        url,
        params: match.params,
        waitUntil: (promise) => ctx.waitUntil(promise),
      });
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      console.error("Unhandled error", request.method, url.pathname, error);
      return json({ error: "Something went wrong on our side. Try again in a minute." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
