// Board: greeting + yesterday, Today (Hot and Warm), All emails table, timeline drawer.
import { api } from "../api.js";
import {
  companyOfEmail,
  dateShort,
  dayHeading,
  esc,
  factsText,
  gmailUrl,
  initial,
  recipientsText,
  tagHtml,
  whyText,
} from "../format.js";
import { openDrawer } from "./drawer.js";
import { renderSetup } from "./setup.js";

/** @typedef {import("../../../../../../shared/contracts").BoardEmail} BoardEmail */

/** Hot first, then Warm; enough to act on today without becoming a second inbox. */
const TODAY_MAX = 6;
/** Refresh while the tab is visible, and whenever the user comes back to it. */
const REFRESH_MS = 2 * 60_000;

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "hot", label: "Hot", test: (e) => !e.stage && e.signal === "hot" },
  { key: "warm", label: "Warm", test: (e) => !e.stage && e.signal === "warm" },
  { key: "seen", label: "Seen", test: (e) => !e.stage && e.signal === "seen" },
  { key: "none", label: "No signal", test: (e) => !e.stage && e.signal === "none" },
  { key: "stage", label: "Has stage", test: (e) => Boolean(e.stage) },
];

const factsClass = (e) => (e.lastActivityAt === null ? "quiet" : e.clicks.length ? "clicked" : "");

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
}

function headline(emails) {
  const worth = emails.filter((e) => !e.stage && (e.signal === "hot" || e.signal === "warm")).length;
  if (worth > 0) {
    const who = worth === 1 ? "1 person" : `${worth} people`;
    return `${greeting()} <span class="hl">${who}</span> ${worth === 1 ? "is" : "are"} worth a follow-up today.`;
  }
  if (emails.some((e) => e.lastActivityAt !== null)) return `${greeting()} Nothing stands out today.`;
  return `${greeting()} No opens yet. Most people open within a day.`;
}

/** @param {BoardEmail} e */
function cardHtml(e, account) {
  const company = companyOfEmail(e);
  return `
    <article class="box lift card">
      <div class="card-top">
        <span class="av pii">${esc(initial(company))}</span>
        <div><p class="card-co pii">${esc(company)}</p><p class="card-who pii">${esc(recipientsText(e.recipients))}</p></div>
        ${tagHtml(e)}
      </div>
      <p class="facts ${factsClass(e)}">${esc(factsText(e))}</p>
      <p class="card-why">${esc(whyText(e))}</p>
      <div class="card-actions">
        <a class="btn" href="${esc(gmailUrl(e, account))}" target="_blank" rel="noopener">follow up in gmail ↗</a>
        <button class="link-btn" type="button" data-replied="${esc(e.tid)}">they replied</button>
        <button class="link-btn" type="button" data-open="${esc(e.tid)}">timeline</button>
      </div>
    </article>`;
}

/** @param {BoardEmail} e */
function rowHtml(e, selected) {
  const company = companyOfEmail(e);
  return `
    <tr data-open="${esc(e.tid)}" aria-selected="${selected}">
      <td><button class="row-btn" type="button" data-open="${esc(e.tid)}"><span class="row-co"><span class="av pii">${esc(initial(company))}</span>
        <span><span class="row-name pii">${esc(company)}</span><span class="row-addr pii">${esc(recipientsText(e.recipients))}</span></span></span></button></td>
      <td class="col-subject"><p class="row-subject pii">${esc(e.subject || "(no subject)")}</p></td>
      <td class="col-facts"><span class="facts ${factsClass(e)}">${esc(factsText(e))}</span></td>
      <td>${tagHtml(e)}</td>
      <td class="row-when col-sent">${esc(dateShort(e.sentAt))}</td>
    </tr>`;
}

export async function renderBoard(view, app) {
  view.innerHTML = `<p class="wrap loading">Loading your board…</p>`;
  /** @type {import("../../../../../../shared/contracts").BoardResponse} */
  let data;
  try {
    data = await api.board();
  } catch (error) {
    view.innerHTML = `<p class="wrap loading error" role="alert">${esc(error.message)}</p>`;
    return;
  }
  if (data.emails.length === 0) {
    renderSetup(view, app, () => renderBoard(view, app));
    return;
  }

  const state = { filter: "all", query: "", selected: null };
  const account = app.session.email;
  const today = data.emails
    .filter((e) => !e.stage && (e.signal === "hot" || e.signal === "warm"))
    .sort((a, b) => (a.signal === b.signal ? (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) : a.signal === "hot" ? -1 : 1))
    .slice(0, TODAY_MAX);
  const y = data.yesterday;

  view.innerHTML = `
    <main class="wrap">
      <section class="intro">
        <div class="intro-text">
          <p class="mono">${esc(dayHeading(Date.now()))} · your board</p>
          <h1>${headline(data.emails)}</h1>
        </div>
        <div class="box yesterday">
          <p class="mono">Yesterday</p>
          <div class="yesterday-nums">
            <span><b>${y.sent}</b> sent</span>
            <span class="o"><b>${y.opened}</b> opened</span>
            <span class="c"><b>${y.clicks}</b> ${y.clicks === 1 ? "click" : "clicks"}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="today-h" style="display: flex; flex-direction: column; gap: 16px">
        <div class="section-head">
          <h2 id="today-h">Today</h2>
          <p class="muted">your most active emails, compared with your own. each one says why.</p>
        </div>
        ${
          today.length
            ? `<div class="today">${today.map((e) => cardHtml(e, account)).join("")}</div>`
            : `<div class="box empty"><p><b>Nothing stands out today.</b></p><p class="muted">Your emails are getting similar attention. New opens and clicks show up here as they happen.</p></div>`
        }
      </section>

      <section class="all" aria-labelledby="all-h">
        <div class="box table-box">
          <div class="table-tools">
            <h2 id="all-h">All emails</h2>
            <div id="chips" style="display: contents"></div>
            <label class="search"><span class="visually-hidden">Search</span>
              <input type="search" id="q" placeholder="search name, company, subject" autocomplete="off" /></label>
          </div>
          <div class="table-scroll">
            <table class="rows">
              <thead><tr><th scope="col">To</th><th scope="col" class="col-subject">Subject</th><th scope="col">What happened</th><th scope="col">Label</th><th scope="col" class="col-sent">Sent</th></tr></thead>
              <tbody id="rows"></tbody>
            </table>
          </div>
        </div>
        <aside class="box lift drawer" id="drawer" aria-label="Email timeline" hidden></aside>
      </section>
    </main>`;

  const byTid = new Map(data.emails.map((e) => [e.tid, e]));
  const rows = view.querySelector("#rows");
  const chips = view.querySelector("#chips");
  const drawer = view.querySelector("#drawer");

  const matches = (e) => {
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    return [companyOfEmail(e), e.subject, ...e.recipients].some((text) => text.toLowerCase().includes(q));
  };

  const draw = () => {
    chips.innerHTML = FILTERS.map((f) => {
      const count = data.emails.filter(f.test).length;
      return `<button class="chip" type="button" data-filter="${f.key}" aria-pressed="${state.filter === f.key}">${f.label} ${count}</button>`;
    }).join("");
    const test = FILTERS.find((f) => f.key === state.filter).test;
    const visible = data.emails.filter((e) => test(e) && matches(e));
    rows.innerHTML = visible.length
      ? visible.map((e) => rowHtml(e, e.tid === state.selected)).join("")
      : `<tr><td colspan="5" class="muted">No emails match.</td></tr>`;
  };

  const select = (tid) => {
    state.selected = tid;
    draw();
    const email = byTid.get(tid);
    view.querySelector(".all").classList.toggle("drawer-open", Boolean(email));
    if (email) openDrawer(drawer, email, account, { onClose: () => select(null), onStageChange: () => renderBoard(view, app) });
    else drawer.hidden = true;
  };

  view.onclick = async (event) => {
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      state.filter = filter.dataset.filter;
      draw();
      return;
    }
    const replied = event.target.closest("[data-replied]");
    if (replied) {
      replied.disabled = true;
      try {
        await api.setStage(replied.dataset.replied, "replied");
        renderBoard(view, app);
      } catch (error) {
        replied.disabled = false;
        replied.textContent = error.message;
      }
      return;
    }
    const open = event.target.closest("[data-open]");
    if (open) select(open.dataset.open);
  };
  view.querySelector("#q").addEventListener("input", (event) => {
    state.query = event.target.value;
    draw();
  });
  draw();
  scheduleRefresh(view, app);
}

let refreshTimer;
let focusBound = false;
function scheduleRefresh(view, app) {
  clearTimeout(refreshTimer);
  const refreshIfIdle = () => {
    const onBoard = !location.hash || location.hash.startsWith("#/board");
    const drawerOpen = !view.querySelector("#drawer")?.hidden;
    const typing = document.activeElement?.id === "q";
    if (onBoard && document.visibilityState === "visible" && !drawerOpen && !typing) renderBoard(view, app);
  };
  refreshTimer = setTimeout(refreshIfIdle, REFRESH_MS);
  if (!focusBound) {
    focusBound = true;
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshIfIdle());
  }
}

