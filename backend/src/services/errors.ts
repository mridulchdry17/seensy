/** What went wrong, in business terms. Services throw these; `app/http.ts` turns each kind into a status code. */
export type ErrorKind = "invalid" | "unauthorized" | "not_found" | "conflict" | "unavailable";

export class AppError extends Error {
  constructor(
    readonly kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export const emailNotFound = () => new AppError("not_found", "No tracked email with this ID on your account.");
