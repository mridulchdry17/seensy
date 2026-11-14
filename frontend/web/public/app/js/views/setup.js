// First run: shown until the first tracked email reaches the board.
import { api } from "../api.js";
import { STORE_URL } from "../config.js";
import { esc } from "../format.js";

const CHECK_EVERY_MS = 15_000;
/** Asking the extension stays inside the browser, so it can be frequent. */
const EXTENSION_CHECK_EVERY_MS = 3_000;
let timer;
let extensionTimer;

export async function renderSetup(view, app, onFirstEmail) {
  const extension = await app.extension;
  const account = app.session.email;
  const extensionReady = Boolean(extension?.accounts.includes(account));
  const done = `<span class="n done" aria-label="done">✓</span>`;

  const extensionStep = extensionReady
    ? `<li class="step">${done}<div><h2>Seensy is in Chrome</h2><p>Found the extension, signed in as <span class="pii">${esc(account)}</span>. Tracking is on.</p></div></li>`
    : `<li class="step now"><span class="n now">2</span><div>
         <h2>${extension ? `Sign in to the extension as <span class="pii">${esc(account)}</span>` : "Add Seensy to Chrome"}</h2>
         <p>${
           extension
             ? "Click the Seensy icon in Chrome's toolbar and sign in with this Google account. This page updates by itself."
             : "The extension adds tracking to Gmail. Already installed? Make sure it's signed in with this account."
         }</p>
         ${extension ? "" : `<a class="btn" href="${esc(STORE_URL)}" target="_blank" rel="noopener">add to chrome ↗</a>`}
       </div></li>`;

  view.innerHTML = `
    <main class="wrap">
      <div class="setup">
        <div class="setup-main">
          <div style="display: flex; flex-direction: column; gap: 12px">
            <p class="mono">Welcome · ${extensionReady ? "2" : "1"} of 3 done</p>
            <h1 style="font-size: clamp(30px, 5vw, 44px)">${extensionReady ? `One step left: <span class="hl">send a tracked email.</span>` : `Let's get <span class="hl">your board</span> going.`}</h1>
            <p class="muted" style="max-width: 560px">Your board fills itself from the emails you send in Gmail. Nothing to import.</p>
          </div>
          <ol class="box lift steps">
            <li class="step">${done}<div><h2>Signed in with Google</h2><p>We only see your name and email address, never your inbox.</p></div></li>
            ${extensionStep}
            <li class="step${extensionReady ? " now" : ""}"><span class="n${extensionReady ? " now" : ""}">3</span><div>
              <h2>Send one email from Gmail</h2>
              <p>Cold email, follow-up, anything. Look for <b style="font-family: var(--mono); color: var(--accent-ink)">✓✓</b> next to Send.</p>
              <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap">
                <a class="btn" href="https://mail.google.com/mail/?authuser=${encodeURIComponent(account)}#inbox?compose=new" target="_blank" rel="noopener">open gmail ↗</a>
                <span class="waiting"><span class="pulse"></span>waiting for your first email…</span>
              </div>
            </div></li>
          </ol>
          <p class="muted" style="font-size: 14px">Optional: <a href="#/settings">add your résumé and LinkedIn links</a> so clicks on them get their proper names.</p>
        </div>
        <aside class="setup-side">
          <p class="mono">What happens next</p>
          <div class="box" style="padding: 16px; display: flex; flex-direction: column; gap: 10px">
            <div style="display: flex; align-items: center; gap: 10px">
              <span class="av">K</span><p style="flex: 1; font-weight: 700">Kite Labs</p><span class="tag t-seen">✓✓ seen</span>
            </div>
            <p class="mono" style="text-transform: none">example · this is how a row looks</p>
          </div>
          <p class="note"><b>the moment they open it,</b> the row flips to ✓✓ here and in gmail. link clicks show in amber.</p>
          <p class="note"><b>your own re-reads never count.</b> open your sent email as often as you like.</p>
          <p class="note"><b>hot and warm are relative to you:</b> your most active emails compared with your other emails, not fixed numbers.</p>
        </aside>
      </div>
    </main>`;

  const leftSetup = () => !view.isConnected || (location.hash && !location.hash.startsWith("#/board"));

  // Step 2 turns green on its own once the user signs in to the extension (no reload needed).
  clearInterval(extensionTimer);
  if (!extensionReady) {
    let asking = false;
    extensionTimer = setInterval(async () => {
      if (leftSetup()) return clearInterval(extensionTimer);
      if (asking) return;
      asking = true;
      const now = await app.refreshExtension();
      asking = false;
      if (now?.accounts.includes(account) && !leftSetup()) renderSetup(view, app, onFirstEmail);
    }, EXTENSION_CHECK_EVERY_MS);
  }

  clearInterval(timer);
  timer = setInterval(async () => {
    if (leftSetup()) return clearInterval(timer);
    try {
      const board = await api.board();
      if (board.emails.length > 0) {
        clearInterval(timer);
        onFirstEmail();
      }
    } catch {
      /* keep waiting; the next check retries */
    }
  }, CHECK_EVERY_MS);
}
