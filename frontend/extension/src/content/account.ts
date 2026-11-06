import { getSettings, normaliseEmail } from "../shared/settings";
import type { InboxSDK } from "./sdk-types";

export interface AccountState {
  /** The Gmail account open in this tab. */
  gmail: string;
  /** Whether that account is signed in to Seensy on this browser. */
  signedIn: boolean;
}

/** Each Gmail account (e.g. /mail/u/0, /mail/u/1) is tracked only under its own Seensy sign-in. */
export async function accountState(sdk: InboxSDK): Promise<AccountState> {
  const gmail = normaliseEmail(sdk.User.getEmailAddress());
  const { accounts } = await getSettings();
  return { gmail, signedIn: gmail in accounts };
}
