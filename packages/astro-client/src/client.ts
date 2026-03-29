import type {
  NatalRequest,
  NatalResponse,
  TransitRequest,
  TransitResponse,
  BatchRequest,
  BatchResponse,
  HealthResponse,
} from "./types.js";

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
}

export class AstroClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: AstroClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorBody: unknown;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = await res.text();
        }
        throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`, errorBody);
      }

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
}
