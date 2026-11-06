import { getSettings } from "../shared/settings";
import type { InboxSDK } from "./sdk-types";

export type AccountState =
  | { kind: "disconnected" }
  | { kind: "otherAccount"; connectedEmail: string }
  | { kind: "active" };

/**
 * Seensy tracks only the Gmail account it is connected to. Other accounts open in the same
 * browser (e.g. /mail/u/1) are left alone so their emails never land in this user's data.
 */
export async function accountState(sdk: InboxSDK): Promise<AccountState> {
  const { apiToken, accountEmail } = await getSettings();
  if (!apiToken) return { kind: "disconnected" };
  const gmailAccount = sdk.User.getEmailAddress().trim().toLowerCase();
  return gmailAccount === accountEmail.trim().toLowerCase()
    ? { kind: "active" }
    : { kind: "otherAccount", connectedEmail: accountEmail };
}
