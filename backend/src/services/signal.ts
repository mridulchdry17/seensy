import type { EventType, Signal } from "../../../shared/contracts";

// How interested a recipient looks, judged against the user's OTHER emails rather than fixed
// thresholds: one person's recipients open everything ten times, another's open once. Only
// `person` hits are passed in (scanners, the owner's own views and early hits are already out).

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Hits closer together than this are one sitting (one visit), however many opens it fired. */
export const VISIT_GAP_MS = 30 * MINUTE;
/** A link click is a deliberate act: it counts as much as this many visits. */
export const CLICK_WEIGHT = 3;
/** Coming back on another day is the strongest sign a human cares: each extra day adds this. */
export const RETURN_DAY_BONUS = 1;
/** Activity loses half its weight every this many ms, so today outranks last week. */
export const HALF_LIFE_MS = 3 * DAY;
/** Only emails with activity this recent are ranked against each other. */
export const RANK_WINDOW_MS = 30 * DAY;

export interface Hit {
  type: EventType;
  at: number;
}

export interface Engagement {
  /** Sittings: hits grouped by VISIT_GAP_MS. */
  visits: number;
  /** Different calendar days (in the user's time zone) with at least one hit. */
  days: number;
  clicks: number;
  lastAt: number | null;
  score: number;
}

const decay = (at: number, now: number) => 0.5 ** (Math.max(0, now - at) / HALF_LIFE_MS);

/** `tzOffsetMinutes` is the browser's Date#getTimezoneOffset() (IST is -330). */
export const localDay = (at: number, tzOffsetMinutes: number) => Math.floor((at - tzOffsetMinutes * MINUTE) / DAY);

export function engagement(hits: Hit[], now: number, tzOffsetMinutes: number): Engagement {
  const sorted = [...hits].sort((a, b) => a.at - b.at);
  const seenDays = new Set<number>();
  let visits = 0;
  let clicks = 0;
  let score = 0;
  let previousAt = -Infinity;

  for (const hit of sorted) {
    const weight = decay(hit.at, now);
    if (hit.at - previousAt > VISIT_GAP_MS) {
      visits += 1;
      score += weight;
      const day = localDay(hit.at, tzOffsetMinutes);
      if (!seenDays.has(day)) {
        if (seenDays.size > 0) score += RETURN_DAY_BONUS * weight;
        seenDays.add(day);
      }
    }
    if (hit.type === "click") {
      clicks += 1;
      score += CLICK_WEIGHT * weight;
    }
    previousAt = hit.at;
  }
  return { visits, days: seenDays.size, clicks, lastAt: sorted.at(-1)?.at ?? null, score };
}

export interface Rankable {
  tid: string;
  score: number;
  lastAt: number | null;
  /** False when the user set a stage: their outcome is known, so it leaves the ranking. */
  ranked: boolean;
}

/** Below this many active emails, percentages mean little: only a clear leader is Hot. */
export const SMALL_SAMPLE = 5;
/** In a small sample the leader must beat the runner-up by this factor to be Hot. */
export const SMALL_SAMPLE_LEAD = 1.5;
export const HOT_SHARE = 0.1;
export const HOT_MAX = 3;
export const WARM_SHARE = 0.2;
/** Hot must score at least this multiple of a typical active email, or nothing is Hot. */
export const HOT_OVER_TYPICAL = 2;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** Hot / Warm by rank among the user's own recently active emails; Seen / None otherwise. */
export function assignSignals(items: Rankable[], now: number): Map<string, Signal> {
  const signals = new Map<string, Signal>();
  const active: Rankable[] = [];
  for (const item of items) {
    signals.set(item.tid, item.lastAt === null ? "none" : "seen");
    if (item.ranked && item.lastAt !== null && now - item.lastAt <= RANK_WINDOW_MS && item.score > 0) {
      active.push(item);
    }
  }
  active.sort((a, b) => b.score - a.score || (b.lastAt ?? 0) - (a.lastAt ?? 0));
  if (active.length === 0) return signals;

  if (active.length < SMALL_SAMPLE) {
    const [leader, runnerUp] = active;
    if (leader!.score >= SMALL_SAMPLE_LEAD * (runnerUp?.score ?? 0)) signals.set(leader!.tid, "hot");
    return signals;
  }

  const typical = median(active.map((a) => a.score));
  const hotCount = Math.min(HOT_MAX, Math.max(1, Math.round(active.length * HOT_SHARE)));
  const warmCount = Math.max(1, Math.round(active.length * WARM_SHARE));
  active.slice(0, hotCount + warmCount).forEach((item, rank) => {
    if (rank < hotCount && item.score >= HOT_OVER_TYPICAL * typical) signals.set(item.tid, "hot");
    else if (item.score > typical) signals.set(item.tid, "warm");
  });
  return signals;
}
