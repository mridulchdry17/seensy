import { ID_LENGTH } from "../../../../shared/contracts";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A random tracking ID matching the shared ID_PATTERN. */
export function newTrackingId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => ALPHABET.charAt(b % ALPHABET.length)).join("");
}
