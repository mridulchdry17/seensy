import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { AppError } from "./errors";

// Google's signing keys; jose caches them and refetches when Google rotates keys.
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

const rejected = (why: string) => new AppError("unauthorized", `Google sign-in was rejected: ${why}. Try signing in again.`);

/** Checks the claims jose doesn't: a verified email and our nonce (stops token replay). */
export function identityFromClaims(claims: JWTPayload, expectedNonce: string): GoogleIdentity {
  if (claims.nonce !== expectedNonce) throw rejected("the sign-in request didn't match");
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") throw rejected("no Google account in the token");
  if (claims.email_verified !== true) throw rejected("this Google email address isn't verified");
  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : "",
  };
}

/** Verifies signature, issuer, audience and expiry, then the claims above. */
export async function verifyGoogleIdToken(idToken: string, clientId: string, nonce: string): Promise<GoogleIdentity> {
  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(idToken, GOOGLE_KEYS, { issuer: GOOGLE_ISSUERS, audience: clientId }));
  } catch {
    throw rejected("the token couldn't be verified");
  }
  return identityFromClaims(claims, nonce);
}
