import { describe, expect, it } from "vitest";
import { assignSignals, engagement, type Hit, type Rankable } from "../src/services/signal";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 13, 12, 0); // 13 Nov 2026, 12:00 UTC
const IST = -330;
const open = (at: number): Hit => ({ type: "open", at });
const click = (at: number): Hit => ({ type: "click", at });

describe("engagement", () => {
  it("counts twelve opens in one afternoon as one visit", () => {
    const hits = Array.from({ length: 12 }, (_, i) => open(NOW - 3 * HOUR + i * 5 * MIN));
    const e = engagement(hits, NOW, IST);
    expect(e.visits).toBe(1);
    expect(e.days).toBe(1);
  });

  it("counts opens more than 30 minutes apart as separate visits", () => {
    expect(engagement([open(NOW - 2 * HOUR), open(NOW - HOUR)], NOW, IST).visits).toBe(2);
  });

  it("ranks coming back on other days above many opens in one sitting", () => {
    const sitting = Array.from({ length: 12 }, (_, i) => open(NOW - HOUR + i * MIN));
    const returning = [open(NOW - 2 * DAY), open(NOW - DAY), open(NOW - HOUR)];
    expect(engagement(returning, NOW, IST).days).toBe(3);
    expect(engagement(returning, NOW, IST).score).toBeGreaterThan(engagement(sitting, NOW, IST).score);
  });

  it("weighs a click like three visits", () => {
    const opened = engagement([open(NOW)], NOW, IST).score;
    const clicked = engagement([open(NOW), click(NOW + MIN)], NOW, IST).score;
    expect(clicked - opened).toBeCloseTo(3);
  });

  it("halves the weight of activity every three days", () => {
    expect(engagement([open(NOW - 3 * DAY)], NOW, IST).score).toBeCloseTo(0.5);
  });

  it("uses the user's own calendar days", () => {
    // 23:00 and 01:00 IST are different days in India but the same UTC day.
    const lateEvening = Date.UTC(2026, 10, 12, 17, 30);
    const earlyMorning = lateEvening + 2 * HOUR;
    expect(engagement([open(lateEvening), open(earlyMorning)], NOW, IST).days).toBe(2);
    expect(engagement([open(lateEvening), open(earlyMorning)], NOW, 0).days).toBe(1);
  });

  it("has no score and no last activity without hits", () => {
    expect(engagement([], NOW, IST)).toEqual({ visits: 0, days: 0, clicks: 0, lastAt: null, score: 0 });
  });
});

const item = (tid: string, score: number, ranked = true, lastAt: number | null = NOW - HOUR): Rankable => ({
  tid,
  score: lastAt === null ? 0 : score,
  lastAt,
  ranked,
});
const signalsOf = (items: Rankable[]) => Object.fromEntries(assignSignals(items, NOW));

describe("assignSignals", () => {
  it("marks emails with no real open as none", () => {
    expect(signalsOf([item("a", 0, true, null)])).toEqual({ a: "none" });
  });

  it("makes a clear leader Hot in a small sample", () => {
    expect(signalsOf([item("a", 4), item("b", 2), item("c", 1)])).toEqual({ a: "hot", b: "seen", c: "seen" });
  });

  it("makes nobody Hot in a small sample when the top two are close", () => {
    expect(signalsOf([item("a", 2.5), item("b", 2)])).toEqual({ a: "seen", b: "seen" });
  });

  it("makes the only opened email Hot", () => {
    expect(signalsOf([item("a", 1), item("b", 0, true, null)])).toEqual({ a: "hot", b: "none" });
  });

  it("gives top 10% Hot (max 3) and the next 20% Warm in a large sample", () => {
    // 20 active emails: 2 Hot, 4 Warm.
    const items = Array.from({ length: 20 }, (_, i) => item(`e${i}`, i < 2 ? 10 : i < 6 ? 3 : 1));
    const counts = Object.values(signalsOf(items)).reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
    expect(counts).toEqual({ hot: 2, warm: 4, seen: 14 });
  });

  it("caps Hot at three", () => {
    const items = Array.from({ length: 60 }, (_, i) => item(`e${i}`, i < 10 ? 10 : 1));
    expect(Object.values(signalsOf(items)).filter((s) => s === "hot")).toHaveLength(3);
  });

  it("makes nobody Hot or Warm when every email looks alike", () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`e${i}`, 1));
    expect(new Set(Object.values(signalsOf(items)))).toEqual(new Set(["seen"]));
  });

  it("keeps the top email Warm, not Hot, when it isn't twice a typical one", () => {
    const items = [item("top", 1.5), ...Array.from({ length: 9 }, (_, i) => item(`e${i}`, 1))];
    expect(signalsOf(items).top).toBe("warm");
  });

  it("leaves emails with a stage out of the ranking", () => {
    expect(signalsOf([item("replied", 10, false), item("a", 2), item("b", 1)])).toEqual({ replied: "seen", a: "hot", b: "seen" });
  });

  it("leaves emails quiet for over 30 days out of the ranking", () => {
    expect(signalsOf([item("old", 1, true, NOW - 40 * DAY), item("a", 1)])).toEqual({ old: "seen", a: "hot" });
  });
});
