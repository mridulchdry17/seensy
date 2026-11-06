import { sha256Hex } from "../app/crypto";
import { HttpError } from "../app/http";
import { userModel } from "../models/user.model";
import type { RequestContext, User } from "../types";

/** Resolves the Bearer session token to a user, or throws 401. */
export async function requireUser(ctx: RequestContext): Promise<User> {
  const token = ctx.request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) throw new HttpError(401, "You're not signed in. Click the Seensy icon and sign in with Google.");
  const user = await userModel.findBySessionHash(ctx.env.DB, await sha256Hex(token));
  if (!user) throw new HttpError(401, "Your Seensy session has ended. Sign in with Google again.");
  return user;
}
