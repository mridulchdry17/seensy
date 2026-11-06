import type {
  ActivityItem,
  ApiErrorBody,
  EmailSummary,
  GoogleSignInRequest,
  RegisterEmailRequest,
  SelfViewRequest,
  SignInResponse,
} from "../../../../shared/contracts";
import { API_BASE } from "../config";
import { getSettings, normaliseEmail } from "../shared/settings";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Thrown when a call is made for a Gmail account that isn't signed in to Seensy. */
export class NotSignedInError extends Error {}

async function call<T>(method: string, path: string, options: { token?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(API_BASE + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, error?.error ?? `Seensy request failed (${response.status}).`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function exchangeGoogleToken(body: GoogleSignInRequest): Promise<SignInResponse> {
  return call("POST", "/api/auth/google", { body });
}

/** The only place the extension talks to seensy-api on behalf of a signed-in account. */
export class ApiClient {
  private constructor(private readonly token: string) {}

  static async forAccount(email: string): Promise<ApiClient> {
    const session = (await getSettings()).accounts[normaliseEmail(email)];
    if (!session) throw new NotSignedInError(`${email} isn't signed in to Seensy.`);
    return new ApiClient(session.token);
  }

  /** One client per signed-in account, in sign-in order. */
  static async all(): Promise<ApiClient[]> {
    const { accounts } = await getSettings();
    return Object.values(accounts).map((session) => new ApiClient(session.token));
  }

  registerEmail(body: RegisterEmailRequest): Promise<void> {
    return call("POST", "/api/emails", { token: this.token, body });
  }

  attachThread(tid: string, threadId: string): Promise<void> {
    return call("PATCH", `/api/emails/${tid}`, { token: this.token, body: { threadId } });
  }

  recordSelfView(body: SelfViewRequest): Promise<void> {
    return call("POST", "/api/self-views", { token: this.token, body });
  }

  emailsByThreads(threadIds: string[]): Promise<EmailSummary[]> {
    return call("GET", `/api/emails?threadIds=${encodeURIComponent(threadIds.join(","))}`, { token: this.token });
  }

  activity(since: number): Promise<ActivityItem[]> {
    return call("GET", `/api/activity?since=${since}`, { token: this.token });
  }
}
