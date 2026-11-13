import { beforeEach, describe, expect, it } from "vitest";
import { findOwnPixels, instrumentEmailBody } from "../src/content/instrument";

const API = "https://seensy-api.example.dev";
const TID = "aaaaaaaaaaaa";

let counter = 0;
const nextId = () => `l${String(++counter).padStart(11, "0")}`;

function body(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

beforeEach(() => {
  counter = 0;
});

describe("instrumentEmailBody", () => {
  it("rewrites each link through the tracker and keeps the visible text", () => {
    const el = body(
      `<a href="https://drive.google.com/file/d/x/view">Résumé</a> | <a href="https://www.linkedin.com/in/me/">LinkedIn</a>`,
    );
    const links = instrumentEmailBody(el, TID, API, nextId);

    expect(links).toEqual([
      { lid: "l00000000001", url: "https://drive.google.com/file/d/x/view", label: "Résumé" },
      { lid: "l00000000002", url: "https://www.linkedin.com/in/me/", label: "LinkedIn" },
    ]);
    const anchors = el.querySelectorAll("a");
    expect(anchors[0]?.getAttribute("href")).toBe(`${API}/c/l00000000001`);
    expect(anchors[0]?.textContent).toBe("Résumé");
  });

  it("adds exactly one open pixel for the email", () => {
    const el = body("<p>Hi</p>");
    instrumentEmailBody(el, TID, API, nextId);
    expect(findOwnPixels(el, API).map((p) => p.tid)).toEqual([TID]);
  });

  it("puts the pixel at the top, so Gmail clipping a long email can't cut it off", () => {
    const el = body("<p>Hi</p><p>long signature…</p>");
    instrumentEmailBody(el, TID, API, nextId);
    expect(el.firstElementChild).toBe(findOwnPixels(el, API)[0]?.img);
  });

  it("leaves an empty label when the link text is the URL itself", () => {
    const el = body(`<a href="https://github.com/me">https://github.com/me</a>`);
    expect(instrumentEmailBody(el, TID, API, nextId)[0]?.label).toBe("");
  });

  it("skips mailto, tel and links inside quoted earlier messages", () => {
    const el = body(
      `<a href="mailto:me@x.com">mail</a><a href="tel:+91">call</a>
       <div class="gmail_quote"><a href="https://their.site/">theirs</a></div>`,
    );
    expect(instrumentEmailBody(el, TID, API, nextId)).toEqual([]);
    expect(el.querySelector(".gmail_quote a")?.getAttribute("href")).toBe("https://their.site/");
  });

  it("removes an old pixel from a quoted reply and never re-wraps tracked links", () => {
    const el = body(
      `<a href="${API}/c/l00000000099">Résumé</a>
       <div class="gmail_quote"><img src="${API}/o/bbbbbbbbbbbb.gif"></div>`,
    );
    expect(instrumentEmailBody(el, TID, API, nextId)).toEqual([]);
    expect(findOwnPixels(el, API).map((p) => p.tid)).toEqual([TID]);
  });
});

describe("findOwnPixels", () => {
  it("reads the email id from Gmail's proxied image URL", () => {
    const proxied = `https://ci3.googleusercontent.com/meips/AbC123=s0-d-e1-ft#${API}/o/cccccccccccc.gif`;
    const el = body(`<img src="${proxied}"><img src="https://other.site/o/dddddddddddd.gif">`);
    expect(findOwnPixels(el, API).map((p) => p.tid)).toEqual(["cccccccccccc"]);
  });
});
