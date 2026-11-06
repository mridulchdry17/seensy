import type { ActivityItem } from "../../../../shared/contracts";
import { describeActivity, timeAgo } from "../shared/format";
import { sendMessage } from "../shared/messages";
import { getSettings, saveSettings } from "../shared/settings";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`popup.html is missing #${id}`);
  return node as T;
}

const ui = {
  account: el("account"),
  connectView: el("connect-view"),
  connectForm: el<HTMLFormElement>("connect-form"),
  token: el<HTMLInputElement>("token"),
  connectButton: el<HTMLButtonElement>("connect-button"),
  connectError: el("connect-error"),
  mainView: el("main-view"),
  trackDefault: el<HTMLInputElement>("track-default"),
  feed: el<HTMLUListElement>("feed"),
  feedEmpty: el("feed-empty"),
  feedError: el("feed-error"),
  footer: el("footer"),
  disconnect: el<HTMLButtonElement>("disconnect"),
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function showMessage(target: HTMLElement, text: string | null): void {
  target.textContent = text ?? "";
  target.hidden = text === null;
}

function feedRow(item: ActivityItem): HTMLLIElement {
  const li = document.createElement("li");
  const dot = document.createElement("span");
  dot.className = item.type === "click" ? "dot click" : "dot";
  const what = document.createElement("span");
  what.className = "what";
  what.textContent = describeActivity(item);
  const subject = document.createElement("span");
  subject.className = "subject";
  subject.textContent = item.subject || "(no subject)";
  what.append(subject);
  const when = document.createElement("time");
  when.className = "when";
  when.dateTime = new Date(item.at).toISOString();
  when.textContent = timeAgo(item.at);
  li.append(dot, what, when);
  return li;
}

async function loadFeed(): Promise<void> {
  try {
    const items = await sendMessage("activity.recent", {});
    ui.feed.replaceChildren(...items.map(feedRow));
    ui.feedEmpty.hidden = items.length > 0;
    showMessage(ui.feedError, null);
  } catch (error) {
    showMessage(ui.feedError, errorText(error));
  }
}

async function render(): Promise<void> {
  const settings = await getSettings();
  const connected = Boolean(settings.apiToken);
  ui.connectView.hidden = connected;
  ui.mainView.hidden = !connected;
  ui.footer.hidden = !connected;
  ui.account.textContent = connected ? settings.accountEmail : "Not connected";
  ui.trackDefault.checked = settings.trackByDefault;
  if (connected) await loadFeed();
  else ui.token.focus();
}

ui.connectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiToken = ui.token.value.trim();
  if (!apiToken) {
    showMessage(ui.connectError, "Paste your API token first.");
    return;
  }
  ui.connectButton.disabled = true;
  ui.connectButton.textContent = "Connecting…";
  try {
    await sendMessage("account.connect", { apiToken });
    ui.token.value = "";
    showMessage(ui.connectError, null);
    await render();
  } catch (error) {
    showMessage(ui.connectError, errorText(error));
  } finally {
    ui.connectButton.disabled = false;
    ui.connectButton.textContent = "Connect";
  }
});

ui.trackDefault.addEventListener("change", () => {
  void saveSettings({ trackByDefault: ui.trackDefault.checked });
});

ui.disconnect.addEventListener("click", async () => {
  await sendMessage("account.disconnect", {});
  await render();
});

void render();
