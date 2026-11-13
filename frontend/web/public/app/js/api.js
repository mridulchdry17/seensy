// The only place the web app calls the Seensy API.
import { API_BASE } from "./config.js";
import { currentSession, signOut } from "./session.js";

/** @typedef {import("../../../../../shared/contracts").BoardResponse} BoardResponse */
/** @typedef {import("../../../../../shared/contracts").TimelineItem} TimelineItem */
/** @typedef {import("../../../../../shared/contracts").ActivityItem} ActivityItem */
/** @typedef {import("../../../../../shared/contracts").UserLink} UserLink */

async function call(method, path, body) {
  const session = currentSession();
  if (!session) throw new Error("You're signed out.");
  const response = await fetch(API_BASE + path, {
    method,
    headers: { authorization: `Bearer ${session.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) {
    signOut();
    throw new Error("Your session ended. Sign in again.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? `Seensy couldn't load this (${response.status}). Try again in a minute.`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  /** @returns {Promise<BoardResponse>} */
  board: () => call("GET", `/api/board?tz=${new Date().getTimezoneOffset()}`),
  /** @returns {Promise<TimelineItem[]>} */
  timeline: (tid) => call("GET", `/api/emails/${encodeURIComponent(tid)}/timeline`),
  setStage: (tid, stage) => call("PUT", `/api/emails/${encodeURIComponent(tid)}/stage`, { stage }),
  /** @returns {Promise<ActivityItem[]>} */
  activity: (since) => call("GET", `/api/activity?since=${since}`),
  /** @returns {Promise<UserLink[]>} */
  links: () => call("GET", "/api/links"),
  /** @returns {Promise<UserLink>} */
  saveLink: (name, url) => call("POST", "/api/links", { name, url }),
  removeLink: (id) => call("DELETE", `/api/links/${id}`),
};
