// Pure DOM work on an email body: no InboxSDK, no network. Unit tested.
import { PIXEL_ID_IN_URL, trackingPaths, type TrackedLinkInput } from "../../../../shared/contracts";

/** The API accepts at most this many links per email; any extra stay untracked. */
const MAX_LINKS = 50;
const MAX_LABEL = 120;
/** Gmail wraps quoted earlier messages in these; their links belong to someone else's email. */
const QUOTED = ".gmail_quote, blockquote";

export interface OwnPixel {
  img: HTMLImageElement;
  tid: string;
}

/**
 * Finds Seensy pixels for our API host. Works on raw URLs and on Gmail's proxied ones,
 * which keep the original URL after `#`.
 */
export function findOwnPixels(root: ParentNode, apiBase: string): OwnPixel[] {
  const host = new URL(apiBase).host;
  const found: OwnPixel[] = [];
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    const tid = src.includes(host) ? src.match(PIXEL_ID_IN_URL)?.[1] : undefined;
    if (tid) found.push({ img, tid });
  }
  return found;
}

function createPixel(doc: Document, src: string): HTMLImageElement {
  const img = doc.createElement("img");
  img.src = src;
  img.width = 1;
  img.height = 1;
  img.alt = "";
  img.setAttribute("style", "display:block;width:1px;height:1px;border:0");
  return img;
}

/**
 * Rewrites every http(s) link the sender wrote to go through the tracker, adds one open pixel,
 * and returns the links to register. Pixels already in the body (e.g. in a quoted reply) are
 * removed so an old email never collects opens of a new one.
 */
export function instrumentEmailBody(
  body: HTMLElement,
  tid: string,
  apiBase: string,
  newId: () => string,
): TrackedLinkInput[] {
  for (const { img } of findOwnPixels(body, apiBase)) img.remove();

  const links: TrackedLinkInput[] = [];
  for (const anchor of body.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (links.length >= MAX_LINKS) break;
    const url = anchor.getAttribute("href") ?? "";
    if (!/^https?:\/\//i.test(url) || url.startsWith(apiBase) || anchor.closest(QUOTED)) continue;

    const lid = newId();
    const text = (anchor.textContent ?? "").trim();
    links.push({ lid, url, label: text === url ? "" : text.slice(0, MAX_LABEL) });
    anchor.setAttribute("href", apiBase + trackingPaths.click(lid));
  }

  body.appendChild(createPixel(body.ownerDocument, apiBase + trackingPaths.pixel(tid)));
  return links;
}
