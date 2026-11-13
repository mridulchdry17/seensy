import { describe, expect, it } from "vitest";
import { urlKey } from "../src/services/url-key";

describe("urlKey", () => {
  it("ignores protocol, www, trailing slash, query and fragment", () => {
    expect(urlKey("https://www.linkedin.com/in/mridul/?utm=x#top")).toBe("linkedin.com/in/mridul");
    expect(urlKey("http://linkedin.com/in/Mridul")).toBe("linkedin.com/in/mridul");
  });

  it("matches a Drive share link with or without its sharing query", () => {
    const saved = urlKey("https://drive.google.com/file/d/abc123/view");
    expect(urlKey("https://drive.google.com/file/d/abc123/view?usp=sharing")).toBe(saved);
  });

  it("rejects anything that isn't an http(s) URL", () => {
    expect(urlKey("linkedin.com/in/me")).toBeNull();
    expect(urlKey("mailto:me@example.com")).toBeNull();
  });
});
