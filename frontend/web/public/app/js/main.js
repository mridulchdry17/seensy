// Seensy web app: sign-in, then Board / Activity / Settings (hash routes), first-run setup
// until the first tracked email arrives.
import { detectExtension } from "./extension.js";
import { esc } from "./format.js";
import { currentSession } from "./session.js";
import { renderActivity } from "./views/activity.js";
import { renderBoard } from "./views/board.js";
import { renderSettings } from "./views/settings.js";
import { renderSignIn } from "./views/signin.js";

const BLUR_KEY = "seensy:blur";
const view = document.getElementById("view");
const routes = { board: renderBoard, activity: renderActivity, settings: renderSettings };

/** Shared with every view: who is signed in and whether the extension is in this browser. */
const app = { session: currentSession(), extension: detectExtension() };

function setupBlur() {
  const button = document.getElementById("blur");
  const apply = (on) => {
    document.body.classList.toggle("blur", on);
    button.setAttribute("aria-pressed", String(on));
  };
  let on = false;
  try {
    on = localStorage.getItem(BLUR_KEY) === "1";
  } catch {
    /* storage blocked: start unblurred */
  }
  apply(on);
  button.addEventListener("click", () => {
    on = !on;
    apply(on);
    try {
      localStorage.setItem(BLUR_KEY, on ? "1" : "0");
    } catch {
      /* not remembered, still applied */
    }
  });
}

async function showTrackingTag() {
  const slot = document.getElementById("tracking");
  const extension = await app.extension;
  const email = app.session.email;
  if (extension?.accounts.includes(email)) {
    slot.innerHTML = `<span class="tag t-ok">● tracking on</span>`;
  } else if (extension) {
    slot.innerHTML = `<a class="tag t-off" href="#/settings">○ ${esc(email)} not signed in to the extension</a>`;
  } else {
    slot.innerHTML = "";
  }
}

function route() {
  const name = location.hash.replace(/^#\/?/, "").split("/")[0] || "board";
  const render = routes[name] ?? renderBoard;
  document.querySelectorAll(".tab").forEach((tab) => {
    if (tab.dataset.route === (routes[name] ? name : "board")) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  view.onclick = null; // each view sets its own click handler
  render(view, app);
}

if (!app.session) {
  renderSignIn(view);
} else {
  document.querySelector(".tabs").hidden = false;
  document.querySelector(".header-right").hidden = false;
  document.getElementById("account").textContent = app.session.email;
  setupBlur();
  void showTrackingTag();
  window.addEventListener("hashchange", route);
  route();
}
