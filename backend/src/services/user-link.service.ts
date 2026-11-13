import type { SaveUserLinkRequest, UserLink } from "../../../shared/contracts";
import { HttpError } from "../app/http";
import { userLinkModel, type UserLinkRecord } from "../models/user-link.model";
import type { User } from "../types";
import { urlKey } from "./url-key";

/** Plenty for résumé, LinkedIn, portfolio, GitHub and a few projects. */
export const MAX_USER_LINKS = 20;

const toUserLink = ({ id, name, url }: UserLinkRecord): UserLink => ({ id, name, url });

/** What a clicked link is called: the user's saved name for that URL, else the email's own link text. */
export function linkNamer(saved: UserLinkRecord[]): (url: string, label: string) => string {
  const names = new Map(saved.map((link) => [link.urlKey, link.name]));
  return (url, label) => names.get(urlKey(url) ?? "") ?? label;
}

export const userLinkService = {
  async list(db: D1Database, user: User): Promise<UserLink[]> {
    return (await userLinkModel.list(db, user.id)).map(toUserLink);
  },

  async save(db: D1Database, user: User, input: SaveUserLinkRequest): Promise<UserLink> {
    const key = urlKey(input.url);
    if (!key) throw new HttpError(400, "That doesn't look like a web link. Paste the full address, starting with https://");
    const existing = await userLinkModel.list(db, user.id);
    if (!existing.some((link) => link.urlKey === key) && existing.length >= MAX_USER_LINKS) {
      throw new HttpError(409, `You can save up to ${MAX_USER_LINKS} links. Remove one first.`);
    }
    const saved = await userLinkModel.upsert(db, user.id, { name: input.name.trim(), url: input.url.trim(), urlKey: key }, Date.now());
    return toUserLink(saved);
  },

  async remove(db: D1Database, user: User, id: number): Promise<void> {
    if (!(await userLinkModel.remove(db, user.id, id))) throw new HttpError(404, "That saved link doesn't exist any more.");
  },
};
