import type {
  ActivityItem,
  ApiErrorBody,
  EmailSummary,
  MeResponse,
  RegisterEmailRequest,
  SelfViewRequest,
} from "../../../../shared/contracts";
import { API_BASE } from "../config";
import { getSettings } from "../shared/settings";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The only place the extension talks to seensy-api. */
export class ApiClient {
  constructor(private readonly token: string) {}

  /** Throws a 401 ApiError when the extension isn't connected yet. */
  static async fromSettings(): Promise<ApiClient> {
    const { apiToken } = await getSettings();
    if (!apiToken) throw new ApiError(401, "Seensy isn't connected. Open the Seensy popup and paste your API token.");
    return new ApiClient(apiToken);
  }

  me(): Promise<MeResponse> {
    return this.request("GET", "/api/me");
  }

  registerEmail(body: RegisterEmailRequest): Promise<void> {
    return this.request("POST", "/api/emails", body);
  }

  attachThread(tid: string, threadId: string): Promise<void> {
    return this.request("PATCH", `/api/emails/${tid}`, { threadId });
  }

  recordSelfView(body: SelfViewRequest): Promise<void> {
    return this.request("POST", "/api/self-views", body);
  }

  emailsByThreads(threadIds: string[]): Promise<EmailSummary[]> {
    return this.request("GET", `/api/emails?threadIds=${encodeURIComponent(threadIds.join(","))}`);
  }

  activity(since: number): Promise<ActivityItem[]> {
    return this.request("GET", `/api/activity?since=${since}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(API_BASE + path, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(response.status, error?.error ?? `Seensy request failed (${response.status}).`);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
}
