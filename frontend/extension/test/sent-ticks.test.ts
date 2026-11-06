import { describe, expect, it, vi } from "vitest";
import type { EmailSummary } from "../../../shared/contracts";
import { createBatcher } from "../src/content/batch";
import { tickLabel } from "../src/content/sent-ticks";

const summary = (patch: Partial<EmailSummary>): EmailSummary => ({
  tid: "aaaaaaaaaaaa",
  subject: "AI Product Manager role",
  recipients: ["pallav@uolo.com"],
  sentAt: 0,
  threadId: "t1",
  opens: 0,
  early: 0,
  lastOpenedAt: null,
  clicks: [],
  ...patch,
});

describe("tickLabel", () => {
  it("shows a single tick when nobody has opened it", () => {
    expect(tickLabel([summary({})]).title).toBe("✓ Sent");
  });

  it("shows opens and clicked links", () => {
    const label = tickLabel([
      summary({ opens: 2, clicks: [{ label: "Résumé", kind: "Google Drive", count: 1 }] }),
    ]);
    expect(label.title).toBe("✓✓ 2× · Résumé");
  });

  it("combines a thread's original email and its follow-up", () => {
    const label = tickLabel([
      summary({ opens: 1, clicks: [{ label: "Résumé", kind: "Google Drive", count: 1 }] }),
      summary({ tid: "bbbbbbbbbbbb", opens: 2, clicks: [{ label: "Résumé", kind: "Google Drive", count: 1 }, { label: "LinkedIn", kind: "LinkedIn", count: 1 }] }),
    ]);
    expect(label.title).toBe("✓✓ 3× · Résumé, LinkedIn");
  });
});

describe("createBatcher", () => {
  it("turns calls made close together into one load", async () => {
    const load = vi.fn(async (keys: string[]) => keys.map((k) => k.toUpperCase()));
    const get = createBatcher(load, 5);
    const results = await Promise.all([get("a"), get("b"), get("c")]);
    expect(results).toEqual(["A", "B", "C"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("rejects every caller in a failed batch", async () => {
    const get = createBatcher<string, string>(async () => Promise.reject(new Error("offline")), 5);
    await expect(Promise.all([get("a"), get("b")])).rejects.toThrow("offline");
  });
});
