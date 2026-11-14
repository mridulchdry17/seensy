import type { GoogleSignInRequest, SignInResponse } from "../../../shared/contracts";
import { randomToken, sha256Hex } from "../app/crypto";
import { AppError } from "./errors";
import { sessionModel } from "../models/session.model";
import { userModel } from "../models/user.model";
import type { User } from "../types";
import { verifyGoogleIdToken, type GoogleIdentity } from "./google-id-token";

async function findOrCreateUser(db: D1Database, identity: GoogleIdentity, now: number): Promise<User> {
  const existing = await userModel.findForGoogle(db, identity.sub, identity.email);
  if (!existing) {
    const user = { id: randomToken(9), email: identity.email, ownerKey: randomToken(16) };
    await userModel.insert(db, { ...user, googleSub: identity.sub, name: identity.name, createdAt: now });
    return user;
  }
  if (existing.googleSub === null) {
    // Account created before Google sign-in (same email): link it on first sign-in.
    await userModel.linkGoogle(db, existing.id, identity.sub, identity.name);
  } else if (existing.googleSub !== identity.sub) {
    throw new AppError("conflict", "This email is linked to a different Google account.");
  }
  return existing;
}

export const authService = {
  async signInWithGoogle(db: D1Database, clientId: string, input: GoogleSignInRequest): Promise<SignInResponse> {
    if (!clientId) throw new AppError("unavailable", "Google sign-in isn't set up on the server yet.");
    const identity = await verifyGoogleIdToken(input.idToken, clientId, input.nonce);
    const now = Date.now();
    const user = await findOrCreateUser(db, identity, now);

    const token = `sy_${randomToken(32)}`;
    await sessionModel.insert(db, await sha256Hex(token), user.id, now);
    return { token, email: user.email, name: identity.name, ownerKey: user.ownerKey };
  },
};
