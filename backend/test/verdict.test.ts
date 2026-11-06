import { describe, expect, it } from "vitest";
import { EARLY_WINDOW_MS, classifyClick, classifyOpen } from "../src/services/verdict";

const SENT = 1_000_000;
const GMAIL_PROXY = "Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)";

describe("classifyOpen", () => {
  it("counts a Gmail proxy open after the early window as a person", () => {
    expect(classifyOpen({ at: SENT + EARLY_WINDOW_MS + 1, ua: GMAIL_PROXY, sentAt: SENT }, false)).toBe("person");
  });

  it("marks opens inside the early window as early", () => {
    expect(classifyOpen({ at: SENT + 5_000, ua: GMAIL_PROXY, sentAt: SENT }, false)).toBe("early");
  });

  it("marks the owner's own view as self, even when early", () => {
    expect(classifyOpen({ at: SENT + 5_000, ua: GMAIL_PROXY, sentAt: SENT }, true)).toBe("self");
  });

  it("marks known security scanners as scanner", () => {
    expect(classifyOpen({ at: SENT + 600_000, ua: "Mimecast Link Inspector", sentAt: SENT }, false)).toBe("scanner");
  });

  it("treats a hit on an unregistered email as a person", () => {
    expect(classifyOpen({ at: SENT, ua: GMAIL_PROXY, sentAt: null }, false)).toBe("person");
  });
});

describe("classifyClick", () => {
  const later = { at: SENT + 3_600_000, ua: "Mozilla/5.0 (Macintosh) Chrome/130", sentAt: SENT };

  it("counts a normal click as a person", () => {
    expect(classifyClick(later, false, false)).toBe("person");
  });

  it("marks the owner's click as self", () => {
    expect(classifyClick(later, true, false)).toBe("self");
  });

  it("marks a click burst across links as scanner", () => {
    expect(classifyClick(later, false, true)).toBe("scanner");
  });

  it("prefers self over burst when the owner clicks quickly", () => {
    expect(classifyClick(later, true, true)).toBe("self");
  });
});
