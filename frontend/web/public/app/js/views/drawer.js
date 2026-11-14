// One email's story: who it went to, every visit and click, why it's labelled, and its stage.
import { api } from "../api.js";
import { STAGE_TEXT, companyOfEmail, dateShort, esc, gmailUrl, initial, tagHtml, timeShort, whyText } from "../format.js";

/** Same rule as the backend: opens less than 30 minutes apart are one sitting. */
const VISIT_GAP_MS = 30 * 60_000;

const when = (at) => `${dateShort(at)} ${timeShort(at)}`;

/** Collapses bursts of opens into one line per sitting; clicks always get their own line. */
function timelineLines(items) {
  const lines = [];
  let sitting = null;
  let visits = 0;
  for (const item of items) {
    if (item.type === "click") {
      lines.push({ cls: "ck", html: `${esc(when(item.at))} · <b>clicked “${esc(item.link?.label ?? "a link")}”</b>` });
      continue;
    }
    if (sitting && item.at - sitting.lastAt <= VISIT_GAP_MS) {
      sitting.count += 1;
      sitting.lastAt = item.at;
      continue;
    }
    visits += 1;
    sitting = { cls: "op", start: item.at, lastAt: item.at, count: 1, first: visits === 1 };
    lines.push(sitting);
  }
  return lines.map((line) => {
    if (line.cls !== "op") return line;
    const extra = line.count > 1 ? ` (${line.count}× in one sitting)` : "";
    return { cls: "op", html: `${esc(when(line.start))} · <b>${line.first ? "opened" : "opened again"}</b>${extra}` };
  });
}

export function openDrawer(drawer, email, account, { onClose, onStageChange }) {
  const company = companyOfEmail(email);
  drawer.hidden = false;
  drawer.innerHTML = `
    <div class="drawer-head">
      <span class="av pii" style="width: 40px; height: 40px">${esc(initial(company))}</span>
      <div>
        <h3 class="pii">${esc(company)}</h3>
        <p class="muted pii" style="font-size: 13px; overflow-wrap: anywhere">${esc(email.recipients.join(", "))}</p>
        <p style="margin-top: 6px">${tagHtml(email)}</p>
      </div>
      <button class="drawer-close" type="button" aria-label="Close timeline" data-close>×</button>
    </div>
    <p class="pii" style="font-weight: 700">${esc(email.subject || "(no subject)")}</p>
    ${!email.stage && (email.signal === "hot" || email.signal === "warm") ? `<p class="note"><b>why ${email.signal}?</b> ${esc(whyText(email))}</p>` : ""}
    <div class="drawer-section">
      <p class="mono">Timeline</p>
      <ul class="tl" id="tl"><li>${esc(when(email.sentAt))} · sent</li><li>loading…</li></ul>
    </div>
    <div class="drawer-section">
      <p class="mono">Stage</p>
      <div class="stages">${Object.entries(STAGE_TEXT)
        .map(([key, label]) => `<button class="chip" type="button" data-stage="${key}" aria-pressed="${email.stage === key}">${label}</button>`)
        .join("")}</div>
      <p class="muted" style="font-size: 13px">Setting a stage takes the email out of Hot and Warm. Click it again to clear it.</p>
      <p class="error" id="stage-error" role="alert" hidden></p>
    </div>
    <a class="btn" href="${esc(gmailUrl(email, account))}" target="_blank" rel="noopener" style="align-self: flex-start">open in gmail ↗</a>`;

  drawer.querySelector("[data-close]").addEventListener("click", onClose);
  drawer.querySelectorAll("[data-stage]").forEach((button) =>
    button.addEventListener("click", async () => {
      const next = email.stage === button.dataset.stage ? null : button.dataset.stage;
      button.disabled = true;
      try {
        await api.setStage(email.tid, next);
        onStageChange();
      } catch (error) {
        button.disabled = false;
        const message = drawer.querySelector("#stage-error");
        message.textContent = error.message;
        message.hidden = false;
      }
    }),
  );
  drawer.querySelector("[data-close]").focus();

  api.timeline(email.tid).then(
    (items) => {
      const list = drawer.querySelector("#tl");
      if (!list) return;
      const lines = timelineLines(items);
      list.innerHTML =
        `<li>${esc(when(email.sentAt))} · sent</li>` +
        (lines.length ? lines.map((l) => `<li class="${l.cls}">${l.html}</li>`).join("") : `<li>no real opens yet</li>`);
    },
    (error) => {
      const list = drawer.querySelector("#tl");
      if (list) list.innerHTML = `<li>${esc(when(email.sentAt))} · sent</li><li class="error">${esc(error.message)}</li>`;
    },
  );
}
