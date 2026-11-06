import { describe, expect, it } from "vitest";
import { linkKind, linkLabel } from "../src/services/link-kind";

describe("linkKind", () => {
  it.each([
    ["https://drive.google.com/file/d/abc/view", "Google Drive"],
    ["https://docs.google.com/document/d/abc", "Google Drive"],
    ["https://www.linkedin.com/in/mridulchdry/", "LinkedIn"],
    ["https://x.com/Mridulchdry", "X"],
    ["https://github.com/mridulchdry17", "GitHub"],
    ["https://calendly.com/mridul/30min", "Calendar"],
    ["https://www.mridul.dev/work", "mridul.dev"],
  ])("%s → %s", (url, kind) => {
    expect(linkKind(url)).toBe(kind);
  });

  it("does not mistake look-alike domains", () => {
    expect(linkKind("https://notlinkedin.com/x")).toBe("notlinkedin.com");
  });

  it("returns a generic name for an unparsable URL", () => {
    expect(linkKind("not a url")).toBe("Link");
  });
});

describe("linkLabel", () => {
  it("uses the text the sender wrote", () => {
    expect(linkLabel("  Résumé ", "https://drive.google.com/x")).toBe("Résumé");
  });

  it("falls back to the link kind for bare URLs", () => {
    expect(linkLabel("", "https://www.linkedin.com/in/x")).toBe("LinkedIn");
  });
});
