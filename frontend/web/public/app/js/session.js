// The signed-in account on this browser: a Seensy session token from Google sign-in.
import { API_BASE, GOOGLE_CLIENT_ID } from "./config.js";

const KEY = "seensy:session";

/** @returns {{ token: string, email: string, name: string } | null} */
export function currentSession() {
  try {
    const session = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return session && typeof session.token === "string" ? session : null;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing was saved either */
  }
  location.hash = "";
  location.reload();
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
}

let gsiLoading;
function loadGoogleScript() {
  gsiLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Couldn't load Google sign-in. Check your connection and reload."));
    document.head.append(script);
  });
  return gsiLoading;
}

/**
 * Renders Google's "Sign in with Google" button into `container`. On success the Google ID token
 * is exchanged for a Seensy session (the same endpoint the extension uses) and `onSignedIn` runs.
 */
export async function renderSignInButton(container, { onSignedIn, onError }) {
  await loadGoogleScript();
  const nonce = randomNonce();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce,
    callback: async ({ credential }) => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/google`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: credential, nonce }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? `Sign-in failed (${response.status}).`);
        localStorage.setItem(KEY, JSON.stringify({ token: body.token, email: body.email, name: body.name }));
        onSignedIn();
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
      }
    },
  });
  google.accounts.id.renderButton(container, { theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280 });
}
