// Seensy landing page. No dependencies; the page is complete without any of this.
const API_BASE = "https://seensy-api.mridulchdry.workers.dev";
/** Paste the Chrome Web Store URL here once approved: the primary action becomes "Add to Chrome". */
const STORE_URL = "";
const DONE_KEY = "seensy:early-access";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

const onView = (element, callback, threshold = 0.35) => {
  if (!element) return;
  if (reduceMotion || !("IntersectionObserver" in window)) return callback();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        callback();
      }
    },
    { threshold },
  );
  io.observe(element);
};

/* header hairline */
const header = document.querySelector(".site-header");
const updateHeader = () => header?.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

/* section reveals */
document.querySelectorAll(".reveal").forEach((el) => onView(el, () => el.classList.add("in"), 0.12));

/* Fig. 2 bars grow, Fig. 3 timeline draws */
onView(document.getElementById("chart"), () => document.getElementById("chart")?.classList.add("grown"));
onView(document.getElementById("timeline"), () => document.getElementById("timeline")?.classList.add("drawn"));

/* Fig. 1: the board. ✓ sent → ✓✓ opened → ✓✓ 2× · résumé, callouts annotate, notification drops in. */
const notifTimes = [...document.querySelectorAll("[data-notif-time]")];
let notifiedAt = Date.now();
const relative = (since) => {
  const minutes = Math.floor((Date.now() - since) / 60_000);
  return minutes < 1 ? "just now" : `${minutes} min ago`;
};
setInterval(() => notifTimes.forEach((n) => (n.textContent = relative(notifiedAt))), 30_000);

(function board() {
  const board = document.getElementById("board-el");
  const row = document.getElementById("demo-row");
  const status = document.getElementById("demo-status");
  const notif = document.getElementById("demo-notif");
  const replay = document.getElementById("demo-replay");
  if (!board || !row || !status || !notif || !replay) return;
  if (reduceMotion) {
    board.classList.add("annotated");
    return;
  }

  const ticks = '<svg class="tt"><use href="#tt"></use></svg>';
  const STEPS = [
    { at: 0, cls: "sent", html: "✓ sent" },
    { at: 1300, cls: "seen", html: `${ticks}opened` },
    { at: 2600, cls: "seen", html: `${ticks}2× · résumé` },
  ];
  let timers = [];

  const setStatus = ({ cls, html }) => {
    status.className = `tag ${cls} st`;
    status.innerHTML = html;
    void status.offsetWidth;
    if (cls === "seen") status.classList.add("pop");
  };

  function play() {
    timers.forEach(clearTimeout);
    replay.hidden = true;
    notif.classList.add("hidden");
    board.classList.remove("annotated");
    row.classList.remove("live");
    timers = [
      ...STEPS.map((step) =>
        setTimeout(() => {
          setStatus(step);
          row.classList.toggle("live", step.cls === "seen");
        }, step.at),
      ),
      setTimeout(() => board.classList.add("annotated"), 900),
      setTimeout(() => {
        notifiedAt = Date.now();
        notifTimes.forEach((n) => (n.textContent = "just now"));
        notif.classList.remove("hidden");
      }, 3300),
      setTimeout(() => (replay.hidden = false), 4300),
    ];
  }

  onView(row, play, 0.5);
  replay.addEventListener("click", play);
})();

/* early-access forms */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setStatusText(node, text, kind = "") {
  node.innerHTML = "";
  node.className = `form-status ${kind}`.trim();
  if (text) node.append(text);
}

async function joinWaitlist(email, source) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/waitlist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
  } catch {
    throw new Error("network");
  }
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(body?.details?.fieldErrors?.email ? "invalid" : "server");
}

function showDone(form) {
  const done = document.createElement("div");
  done.className = "signup-done box";
  done.setAttribute("role", "status");
  done.innerHTML =
    '<span class="check" aria-hidden="true">✓</span>' +
    "<p><b>You're in.</b><span>We'll email you the install link the moment the Chrome Web Store approves it. " +
    'Meanwhile, <a href="#board">see what you\'ll get</a>.</span></p>';
  form.replaceWith(done);
}

function wireForm(form) {
  const input = form.querySelector("input[type=email]");
  const button = form.querySelector("button[type=submit]");
  const status = form.querySelector(".form-status");
  let submitting = false;

  input.addEventListener("input", () => {
    form.classList.remove("invalid");
    if (status.classList.contains("error")) setStatusText(status, "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      form.classList.add("invalid");
      setStatusText(status, "That email doesn't look right.", "error");
      input.focus();
      return;
    }
    submitting = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    const idle = button.textContent;
    button.textContent = "Joining…";
    setStatusText(status, "");
    try {
      await joinWaitlist(email, form.dataset.source);
      try {
        localStorage.setItem(DONE_KEY, "1");
      } catch {
        /* storage may be blocked; the success state still shows */
      }
      document.querySelectorAll("form[data-signup]").forEach(showDone);
      document.getElementById("sticky-cta")?.classList.remove("show");
    } catch (error) {
      const message =
        error.message === "invalid"
          ? "Enter a valid email address."
          : error.message === "network"
            ? "Couldn't reach Seensy. Check your connection. "
            : "Something went wrong on our side. Try again in a minute. ";
      setStatusText(status, message, "error");
      if (error.message !== "invalid") {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = "Tap to retry.";
        retry.addEventListener("click", () => form.requestSubmit());
        status.append(retry);
      }
    } finally {
      submitting = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = idle;
    }
  });
}

const forms = [...document.querySelectorAll("form[data-signup]")];
let alreadyDone = false;
try {
  alreadyDone = localStorage.getItem(DONE_KEY) === "1";
} catch {
  /* ignore */
}

if (STORE_URL) {
  for (const form of forms) {
    const link = document.createElement("a");
    link.className = "btn";
    link.href = STORE_URL;
    link.textContent = "Add to Chrome, it's free";
    form.replaceWith(link);
  }
} else if (alreadyDone) {
  forms.forEach(showDone);
} else {
  forms.forEach(wireForm);
}

/* sticky CTA on phones once the hero form has scrolled away */
(function stickyCta() {
  const bar = document.getElementById("sticky-cta");
  const heroForm = document.querySelector('form[data-source="hero"]');
  const closing = document.getElementById("early-access");
  if (!bar || !heroForm || !closing || alreadyDone || STORE_URL || !("IntersectionObserver" in window)) return;

  let heroVisible = true;
  let closingVisible = false;
  const update = () => {
    const show = !heroVisible && !closingVisible && !document.querySelector("form[data-signup] input:focus");
    bar.classList.toggle("show", show);
    bar.setAttribute("aria-hidden", String(!show));
    bar.querySelector("a")?.setAttribute("tabindex", show ? "0" : "-1");
  };
  new IntersectionObserver(([e]) => ((heroVisible = e.isIntersecting), update())).observe(heroForm);
  new IntersectionObserver(([e]) => ((closingVisible = e.isIntersecting), update()), { threshold: 0.2 }).observe(closing);
  document.addEventListener("focusin", update);
  document.addEventListener("focusout", () => setTimeout(update, 50));
})();
