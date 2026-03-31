import type {
  NatalRequest,
  NatalResponse,
  TransitRequest,
  TransitResponse,
  BatchRequest,
  BatchResponse,
  HealthResponse,
} from "./types.js";
import type {
  RegisterRequest,
  LoginRequest,
  TokenPair,
  UserProfile,
  CloudChart,
  SaveChartRequest,
  UpdateChartRequest,
  ListChartsParams,
  PaginatedCharts,
  TierLimits,
} from "./auth.js";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AstroClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  onTokenRefreshed?: (tokens: TokenPair) => void;
  onAuthExpired?: () => void;
}

export class AstroClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly onTokenRefreshed?: (tokens: TokenPair) => void;
  private readonly onAuthExpired?: () => void;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: AstroClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.onTokenRefreshed = config.onTokenRefreshed;
    this.onAuthExpired = config.onAuthExpired;
  }

  setTokens(accessToken: string | null, refreshToken: string | null): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  private buildHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (hasBody) headers["Content-Type"] = "application/json";
    if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    skipAuth = false,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: skipAuth
          ? (body ? { "Content-Type": "application/json" } : {})
          : this.buildHeaders(body !== undefined),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.status === 401 && !skipAuth && this.refreshToken) {
        // Token expired — try to refresh once
        try {
          await this.doTokenRefresh();
        } catch {
          this.clearTokens();
          this.onAuthExpired?.();
          throw new ApiError(401, "Session expired. Please log in again.");
        }
        // Retry the original request with new token
        clearTimeout(timer);
        return this.request<T>(method, path, body, false);
      }

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = await res.text();
        }
        throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`, errorBody);
      }

      // Handle empty responses (204 No Content)
      if (res.status === 204) return undefined as T;

      return res.json() as Promise<T>;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(0, `Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async doTokenRefresh(): Promise<void> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error("Refresh failed");
        const tokens = await res.json() as TokenPair;
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.onTokenRefreshed?.(tokens);
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ─── Chart calculation endpoints ───────────────────────────────────────────

  async calculateNatal(request: NatalRequest): Promise<NatalResponse> {
    return this.request<NatalResponse>("POST", "/v1/chart/natal", request);
  }

  async calculateTransits(request: TransitRequest): Promise<TransitResponse> {
    return this.request<TransitResponse>("POST", "/v1/chart/transits", request);
  }

  async calculateBatch(request: BatchRequest): Promise<BatchResponse> {
    return this.request<BatchResponse>("POST", "/v1/chart/batch", request);
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health");
  }

  // ─── Auth endpoints ─────────────────────────────────────────────────────────

  async register(req: RegisterRequest): Promise<TokenPair> {
    return this.request<TokenPair>("POST", "/v1/auth/register", req, true);
  }

  async login(req: LoginRequest): Promise<TokenPair> {
    return this.request<TokenPair>("POST", "/v1/auth/login", req, true);
  }

  async logout(): Promise<void> {
    if (!this.refreshToken) return;
    try {
      await this.request<void>("POST", "/v1/auth/logout", {
        refresh_token: this.refreshToken,
      });
    } finally {
      this.clearTokens();
    }
  }

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>("GET", "/v1/auth/me");
  }

  async getTierLimits(): Promise<TierLimits> {
    return this.request<TierLimits>("GET", "/v1/auth/me/limits");
  }

  // ─── Cloud chart storage endpoints ─────────────────────────────────────────

  async saveCloudChart(req: SaveChartRequest): Promise<CloudChart> {
    return this.request<CloudChart>("POST", "/v1/charts", req);
  }

  async listCloudCharts(params?: ListChartsParams): Promise<PaginatedCharts> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.order) qs.set("order", params.order);
    if (params?.page != null) qs.set("page", String(params.page));
    if (params?.page_size != null) qs.set("page_size", String(params.page_size));
    if (params?.tags?.length) params.tags.forEach((t) => qs.append("tags", t));
    const query = qs.toString();
    return this.request<PaginatedCharts>("GET", `/v1/charts${query ? `?${query}` : ""}`);
  }

  async getCloudChart(id: string): Promise<CloudChart> {
    return this.request<CloudChart>("GET", `/v1/charts/${id}`);
  }

  async deleteCloudChart(id: string): Promise<void> {
    return this.request<void>("DELETE", `/v1/charts/${id}`);
  }

  async updateCloudChart(id: string, req: UpdateChartRequest): Promise<CloudChart> {
    return this.request<CloudChart>("PATCH", `/v1/charts/${id}`, req);
  }
}
