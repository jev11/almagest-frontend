import { describe, it, expect, vi, beforeEach } from "vitest";
import { AstroClient, ApiError } from "./client.js";

const BASE_URL = "http://localhost:8000";

function makeClient(overrides?: { timeoutMs?: number }) {
  return new AstroClient({ baseUrl: BASE_URL, ...overrides });
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AstroClient — URL construction", () => {
  it("strips trailing slash from baseUrl", async () => {
    const fetchSpy = mockFetch(200, { status: "ok" });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AstroClient({ baseUrl: "http://localhost:8000/" });
    await client.health();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/health",
      expect.any(Object),
    );
  });

  it("calls /v1/chart/natal for calculateNatal", async () => {
    const fetchSpy = mockFetch(200, { chart: {} });
    vi.stubGlobal("fetch", fetchSpy);

    const client = makeClient();
    await client.calculateNatal({
      datetime: "2000-01-01T12:00:00Z",
      latitude: 51.5,
      longitude: -0.1,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/v1/chart/natal`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls /v1/chart/transits for calculateTransits", async () => {
    const fetchSpy = mockFetch(200, { transit_chart: {} });
    vi.stubGlobal("fetch", fetchSpy);

    await makeClient().calculateTransits({
      datetime: "2024-01-01T00:00:00Z",
      latitude: 0,
      longitude: 0,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/v1/chart/transits`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls /v1/chart/batch for calculateBatch", async () => {
    const fetchSpy = mockFetch(200, { charts: [] });
    vi.stubGlobal("fetch", fetchSpy);

    await makeClient().calculateBatch({ calculations: [] });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/v1/chart/batch`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends GET for health with no body", async () => {
    const fetchSpy = mockFetch(200, { status: "ok" });
    vi.stubGlobal("fetch", fetchSpy);

    await makeClient().health();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${BASE_URL}/health`,
      expect.objectContaining({ method: "GET", body: undefined }),
    );
  });
});

describe("AstroClient — error handling", () => {
  it("throws ApiError with status 404", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { detail: "Not found" }));

    await expect(makeClient().health()).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("throws ApiError with status 422", async () => {
    vi.stubGlobal("fetch", mockFetch(422, { detail: "Validation error" }));

    await expect(
      makeClient().calculateNatal({
        datetime: "bad",
        latitude: 0,
        longitude: 0,
      }),
    ).rejects.toMatchObject({ name: "ApiError", status: 422 });
  });

  it("throws ApiError with status 500", async () => {
    vi.stubGlobal("fetch", mockFetch(500, "Internal server error"));

    await expect(makeClient().health()).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
    });
  });

  it("throws ApiError on timeout (status 0)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
        return new Promise((_, reject) => {
          opts.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );

    const client = new AstroClient({ baseUrl: BASE_URL, timeoutMs: 1 });
    await expect(client.health()).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
    });
  });

  it("ApiError includes status code and message", () => {
    const err = new ApiError(403, "Forbidden", { detail: "nope" });
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.body).toEqual({ detail: "nope" });
    expect(err instanceof Error).toBe(true);
  });
});
