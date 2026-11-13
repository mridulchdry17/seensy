// Settings: account, the extension, and the user's own links (résumé, LinkedIn, ...).
import { api } from "../api.js";
import { STORE_URL } from "../config.js";
import { esc } from "../format.js";
import { signOut } from "../session.js";

const SUGGESTED = ["Résumé", "LinkedIn", "Portfolio", "GitHub"];

export async function renderSettings(view, app) {
  view.innerHTML = `<p class="wrap loading">Loading settings…</p>`;
  const [links, extension] = await Promise.all([api.links().catch((error) => error), app.extension]);
  const account = app.session.email;
  const signedInExt = extension?.accounts.includes(account);

  view.innerHTML = `
    <main class="wrap">
      <div class="intro-text"><p class="mono">Settings</p><h1 style="font-size: clamp(28px, 4vw, 36px)">Settings</h1></div>
      <div class="settings">
        <section class="box panel" aria-labelledby="links-h">
          <h2 id="links-h">Your links</h2>
          <p class="muted">Save your résumé, LinkedIn or portfolio once. When someone clicks one of them in any email, Seensy shows the name you give it here, even if the link text said “here”.</p>
          <ul class="link-list" id="links"></ul>
          <form class="link-form" id="link-form">
            <label class="field name">Name<input name="name" required maxlength="40" placeholder="Résumé" autocomplete="off" /></label>
            <label class="field url">Link<input name="url" type="url" required placeholder="https://drive.google.com/…" autocomplete="off" /></label>
            <button class="btn" type="submit">save link</button>
          </form>
          <div class="suggest" aria-label="Quick names">${SUGGESTED.map((n) => `<button class="chip" type="button" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>
          <p class="error" id="links-error" role="alert" hidden></p>
        </section>

        <section class="box panel" aria-labelledby="ext-h">
          <h2 id="ext-h">Chrome extension</h2>
          ${
            signedInExt
              ? `<p><span class="tag t-ok">● tracking on</span> The extension is signed in as <span class="pii">${esc(account)}</span>.</p>`
              : extension
                ? `<p>The extension is installed but not signed in as <span class="pii">${esc(account)}</span>. Click the Seensy icon in Chrome's toolbar to sign in.</p>`
                : `<p class="muted">This page can't see the extension. If it's installed and signed in, tracking still works; this page will show it after the next extension update.</p>
                   <a class="btn ghost" style="align-self: flex-start" href="${esc(STORE_URL)}" target="_blank" rel="noopener">get seensy for chrome ↗</a>`
          }
        </section>

        <section class="box panel" aria-labelledby="acct-h">
          <h2 id="acct-h">Account</h2>
          <div class="row-between">
            <p>Signed in as <b class="pii">${esc(account)}</b></p>
            <button class="btn ghost" type="button" id="sign-out">sign out</button>
          </div>
          <p class="muted" style="font-size: 13px">Signing out here doesn't stop tracking in Gmail. <a href="/privacy">How Seensy handles your data</a>.</p>
        </section>
      </div>
    </main>`;

  const list = view.querySelector("#links");
  const error = view.querySelector("#links-error");
  const form = view.querySelector("#link-form");
  const showError = (message) => {
    error.textContent = message;
    error.hidden = !message;
  };
  let saved = links instanceof Error ? [] : links;
  if (links instanceof Error) showError(links.message);

  const draw = () => {
    list.innerHTML = saved.length
      ? saved
          .map(
            (link) => `<li><div><p><b>${esc(link.name)}</b></p><p class="url pii">${esc(link.url)}</p></div>
              <button class="link-btn" type="button" data-remove="${link.id}">remove</button></li>`,
          )
          .join("")
      : `<li class="muted">No links saved yet.</li>`;
  };
  draw();

  view.onclick = async (event) => {
    const chip = event.target.closest("[data-name]");
    if (chip) {
      form.elements.name.value = chip.dataset.name;
      form.elements.url.focus();
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      remove.disabled = true;
      try {
        await api.removeLink(Number(remove.dataset.remove));
        saved = saved.filter((link) => link.id !== Number(remove.dataset.remove));
        draw();
        showError("");
      } catch (e) {
        remove.disabled = false;
        showError(e.message);
      }
      return;
    }
    if (event.target.closest("#sign-out")) signOut();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const link = await api.saveLink(form.elements.name.value, form.elements.url.value);
      saved = [...saved.filter((l) => l.id !== link.id), link];
      form.reset();
      draw();
      showError("");
    } catch (e) {
      showError(e.message);
    } finally {
      button.disabled = false;
    }
  });
}
