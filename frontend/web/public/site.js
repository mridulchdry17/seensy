// Seensy website: hero demo, early-access forms, header state. No dependencies.
const API_BASE = "https://seensy-api.mridulchdry.workers.dev";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Header gets a hairline once the page scrolls. */
const header = document.querySelector(".site-header");
const updateHeader = () => header?.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

/* Hero demo: the top Sent row goes ✓ Sent → ✓✓ 1× → ✓✓ 2× · Résumé, then the notification appears.
   The HTML is already in the final state, so the page is complete without JS or with reduced motion. */
(function heroDemo() {
  const row = document.getElementById("demo-row");
  const label = document.getElementById("demo-label");
  const toast = document.getElementById("demo-toast");
  const replay = document.getElementById("demo-replay");
  if (!row || !label || !toast || !replay || reduceMotion) return;

  const STEPS = [
    { at: 0, kind: "sent", text: "✓ Sent" },
    { at: 1400, kind: "seen", text: "✓✓ 1×" },
    { at: 2900, kind: "seen", text: "✓✓ 2× · Résumé" },
  ];
  let timers = [];

  const setLabel = ({ kind, text }) => {
    label.className = `label ${kind}`;
    label.textContent = text;
    void label.offsetWidth; // restart the pop animation
    if (kind === "seen") label.classList.add("pop");
  };

  function play() {
    timers.forEach(clearTimeout);
    replay.hidden = true;
    toast.classList.add("hidden");
    row.classList.remove("live");
    timers = [
      ...STEPS.map((step) =>
        setTimeout(() => {
          setLabel(step);
          row.classList.toggle("live", step.kind === "seen");
        }, step.at),
      ),
      setTimeout(() => toast.classList.remove("hidden"), 3400),
      setTimeout(() => (replay.hidden = false), 4400),
    ];
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        play();
      }
    },
    { threshold: 0.5 },
  );
  observer.observe(row);
  replay.addEventListener("click", play);
})();

/* Early-access forms (hero and footer). */
function setStatus(element, text, kind) {
  if (!element) return;
  element.textContent = text;
  element.className = `form-status ${kind}`;
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
    throw new Error("Couldn't reach Seensy. Check your connection and try again.");
  }
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(
    body?.details?.fieldErrors?.email ? "Enter a valid email address." : "Something went wrong on our side. Try again in a minute.",
  );
}

document.querySelectorAll("form[data-waitlist]").forEach((form) => {
  const input = form.querySelector("input[type=email]");
  const button = form.querySelector("button");
  const status = form.nextElementSibling;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!email || !input.checkValidity()) {
      setStatus(status, "Enter a valid email address.", "error");
      input.focus();
      return;
    }
    button.disabled = true;
    const idleText = button.textContent;
    button.textContent = "Joining…";
    try {
      await joinWaitlist(email, form.dataset.source);
      setStatus(status, "You're on the list. We'll email you when Seensy is live.", "ok");
      form.reset();
    } catch (error) {
      setStatus(status, error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = idleText;
    }
  });
});

/* Pricing buttons: remember which plan was picked and focus the footer form. */
const footerForm = document.querySelector('form[data-source="footer"]');
document.querySelectorAll("[data-plan]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!footerForm) return;
    footerForm.dataset.source = `pricing-${link.dataset.plan}`;
    setTimeout(() => footerForm.querySelector("input")?.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
  });
});
