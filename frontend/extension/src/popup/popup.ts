import type { ActivityItem } from "../../../../shared/contracts";
import { describeActivity, timeAgo } from "../shared/format";
import { sendMessage } from "../shared/messages";
import { getSettings, saveSettings, type AccountSession } from "../shared/settings";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`popup.html is missing #${id}`);
  return node as T;
}

const ui = {
  welcomeView: el("welcome-view"),
  accountsView: el("accounts-view"),
  accounts: el<HTMLUListElement>("accounts"),
  signIn: el<HTMLButtonElement>("sign-in"),
  signInLabel: el("sign-in-label"),
  signInError: el("sign-in-error"),
  mainView: el("main-view"),
  trackDefault: el<HTMLInputElement>("track-default"),
  feed: el<HTMLUListElement>("feed"),
  feedEmpty: el("feed-empty"),
  feedError: el("feed-error"),
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function showMessage(target: HTMLElement, text: string | null): void {
  target.textContent = text ?? "";
  target.hidden = text === null;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function accountRow(email: string, session: AccountSession): HTMLLIElement {
  const li = document.createElement("li");
  const who = node("span", "who");
  who.append(node("strong", "", session.name || email), node("span", "", email));
  const signOut = node("button", "link", "Sign out");
  signOut.type = "button";
  signOut.setAttribute("aria-label", `Sign out ${email}`);
  signOut.addEventListener("click", async () => {
    await sendMessage("account.signOut", { account: email });
    await render();
  });
  li.append(node("span", "avatar", (session.name || email).charAt(0).toUpperCase()), who, signOut);
  return li;
}

function feedRow(item: ActivityItem): HTMLLIElement {
  const li = document.createElement("li");
  const what = node("span", "what", describeActivity(item));
  what.append(node("span", "subject", item.subject || "(no subject)"));
  const when = node("time", "when", timeAgo(item.at));
  when.dateTime = new Date(item.at).toISOString();
  li.append(node("span", item.type === "click" ? "dot click" : "dot"), what, when);
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
  const { accounts, trackByDefault } = await getSettings();
  const entries = Object.entries(accounts);
  const signedIn = entries.length > 0;

  ui.welcomeView.hidden = signedIn;
  ui.accountsView.hidden = !signedIn;
  ui.mainView.hidden = !signedIn;
  ui.accounts.replaceChildren(...entries.map(([email, session]) => accountRow(email, session)));
  ui.signInLabel.textContent = signedIn ? "Add another Google account" : "Sign in with Google";
  ui.trackDefault.checked = trackByDefault;
  if (signedIn) await loadFeed();
}

ui.signIn.addEventListener("click", async () => {
  ui.signIn.disabled = true;
  showMessage(ui.signInError, null);
  try {
    await sendMessage("account.signIn", {});
    await render();
  } catch (error) {
    showMessage(ui.signInError, errorText(error));
  } finally {
    ui.signIn.disabled = false;
  }
});

ui.trackDefault.addEventListener("change", () => {
  void saveSettings({ trackByDefault: ui.trackDefault.checked });
});

void render();
