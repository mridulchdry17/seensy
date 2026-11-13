import { renderSignInButton } from "../session.js";

export function renderSignIn(view) {
  view.innerHTML = `
    <div class="center">
      <section class="box lift signin" aria-labelledby="signin-h">
        <p class="mono">Your board</p>
        <h1 id="signin-h">See who opened your emails.</h1>
        <p class="muted">Sign in with the same Google account you use in the Seensy extension. Seensy only sees your name and email address, never your inbox.</p>
        <div class="gbtn" id="gbtn"></div>
        <p class="error" id="signin-error" role="alert" hidden></p>
        <p class="muted" style="font-size: 13px">New here? <a href="/">See how Seensy works</a>.</p>
      </section>
    </div>`;
  const error = view.querySelector("#signin-error");
  const showError = (message) => {
    error.textContent = message;
    error.hidden = false;
  };
  renderSignInButton(view.querySelector("#gbtn"), {
    onSignedIn: () => location.reload(),
    onError: showError,
  }).catch((e) => showError(e.message));
}
