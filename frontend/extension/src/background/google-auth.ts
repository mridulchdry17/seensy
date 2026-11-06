// Google sign-in via chrome.identity.launchWebAuthFlow (works in Chrome and Brave).
// Asks only for openid/email/profile: Seensy never reads or sends Gmail through Google's APIs.
import type { GoogleSignInRequest } from "../../../../shared/contracts";
import { GOOGLE_CLIENT_ID } from "../config";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function randomString(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Opens Google's sign-in window and returns the ID token for the backend to verify. */
export async function signInWithGoogle(loginHint?: string): Promise<GoogleSignInRequest> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in isn't set up in this build yet (GOOGLE_CLIENT_ID is empty).");

  const nonce = randomString();
  const state = randomString();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: "id_token",
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: "openid email profile",
    nonce,
    state,
  });
  // With a hint, Google pre-selects that account; without one, let the user choose.
  if (loginHint) params.set("login_hint", loginHint);
  else params.set("prompt", "select_account");

  let redirect: string | undefined;
  try {
    redirect = await chrome.identity.launchWebAuthFlow({ url: `${AUTH_URL}?${params}`, interactive: true });
  } catch {
    throw new Error("Sign-in was closed before it finished.");
  }
  const result = new URLSearchParams(new URL(redirect ?? "about:blank").hash.slice(1));
  const error = result.get("error");
  if (error) throw new Error(`Google sign-in failed (${error}).`);
  if (result.get("state") !== state) throw new Error("Google sign-in returned an unexpected response. Try again.");
  const idToken = result.get("id_token");
  if (!idToken) throw new Error("Google didn't return a sign-in token. Try again.");
  return { idToken, nonce };
}
