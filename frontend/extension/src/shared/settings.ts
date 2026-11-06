export interface Settings {
  apiToken: string;
  accountEmail: string;
  trackByDefault: boolean;
}

const DEFAULTS: Settings = { apiToken: "", accountEmail: "", trackByDefault: true };

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored } as Settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}
