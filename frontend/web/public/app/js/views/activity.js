// Activity: every real open and click in the last 7 days, newest first. No labels, just events.
import { api } from "../api.js";
import { companyOf, dayHeading, esc, timeShort } from "../format.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Same rule as the board: opens of one email less than 30 minutes apart are one sitting. */
const VISIT_GAP_MS = 30 * 60_000;

/** Newest-first items → one entry per sitting for opens (with a count), every click on its own. */
function collapseSittings(items) {
  const entries = [];
  const openByTid = new Map();
  for (const item of items) {
    const sitting = item.type === "open" ? openByTid.get(item.tid) : null;
    if (sitting && sitting.earliest - item.at <= VISIT_GAP_MS) {
      sitting.count += 1;
      sitting.earliest = item.at;
      continue;
    }
    const entry = { ...item, count: 1, earliest: item.at };
    if (item.type === "open") openByTid.set(item.tid, entry);
    entries.push(entry);
  }
  return entries;
}

export async function renderActivity(view) {
  view.innerHTML = `<p class="wrap loading">Loading activity…</p>`;
  let items;
  try {
    items = await api.activity(Date.now() - WEEK_MS);
  } catch (error) {
    view.innerHTML = `<p class="wrap loading error" role="alert">${esc(error.message)}</p>`;
    return;
  }

  const days = new Map();
  for (const item of collapseSittings(items)) {
    const day = dayHeading(item.at);
    days.set(day, [...(days.get(day) ?? []), item]);
  }

  const itemHtml = (item) => {
    const who = companyOf(item.recipients[0] ?? "");
    const what = item.type === "click" ? `clicked “${esc(item.link?.label ?? "a link")}”` : `opened your email${item.count > 1 ? ` <span class="muted">(${item.count}× in one sitting)</span>` : ""}`;
    return `
      <div class="box feed-item">
        <span class="feed-dot${item.type === "click" ? " ck" : ""}" aria-hidden="true"></span>
        <div>
          <p><b class="pii">${esc(who)}</b> ${what}</p>
          <p class="muted pii" style="font-size: 13px">${esc(item.subject || "(no subject)")}</p>
        </div>
        <span class="row-when">${esc(timeShort(item.at))}</span>
      </div>`;
  };

  view.innerHTML = `
    <main class="wrap">
      <div class="intro-text">
        <p class="mono">Last 7 days</p>
        <h1 style="font-size: clamp(28px, 4vw, 36px)">Activity</h1>
        <p class="muted">Every real open and click, as it happened. Scanners and your own views are already left out.</p>
      </div>
      <div class="feed">
        ${
          items.length
            ? [...days].map(([day, list]) => `<section class="feed-day"><p class="mono">${esc(day)}</p>${list.map(itemHtml).join("")}</section>`).join("")
            : `<div class="box empty"><p><b>No opens or clicks this week yet.</b></p><p class="muted">They show up here the moment they happen.</p></div>`
        }
      </div>
    </main>`;
}
