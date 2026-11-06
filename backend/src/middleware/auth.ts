import { HttpError } from "../app/http";
import { userModel } from "../models/user.model";
import type { RequestContext, User } from "../types";

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Resolves the Bearer token to a user, or throws 401. */
export async function requireUser(ctx: RequestContext): Promise<User> {
  const token = ctx.request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) throw new HttpError(401, "Missing API token. Connect the extension in its popup.");
  const user = await userModel.findByTokenHash(ctx.env.DB, await sha256Hex(token));
  if (!user) throw new HttpError(401, "This API token is not valid. Paste a current token in the extension popup.");
  return user;
}
