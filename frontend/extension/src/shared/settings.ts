/** A Gmail account signed in to Seensy on this browser. */
export interface AccountSession {
  token: string;
  ownerKey: string;
  name: string;
}

export interface Settings {
  /** Keyed by normalised Gmail address. */
  accounts: Record<string, AccountSession>;
  trackByDefault: boolean;
}

const DEFAULTS: Settings = { accounts: {}, trackByDefault: true };

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored } as Settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}
