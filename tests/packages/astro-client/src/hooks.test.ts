import { describe, it, expect } from "vitest";
import { HouseSystem } from "@astro-app/shared-types";
import { hashRequest, chartKeys } from "../../../../packages/astro-client/src/hooks.js";
import type { NatalRequest } from "../../../../packages/astro-client/src/types.js";

describe("hashRequest — determinism", () => {
  it("produces the same hash for identical objects", () => {
    const req: NatalRequest = {
      datetime: "2000-01-01T12:00:00Z",
      latitude: 51.5,
      longitude: -0.1,
    };
    expect(hashRequest(req)).toBe(hashRequest(req));
  });

  it("produces the same hash regardless of key order", () => {
    const a = { datetime: "2000-01-01T12:00:00Z", latitude: 51.5, longitude: -0.1 };
    const b = { longitude: -0.1, datetime: "2000-01-01T12:00:00Z", latitude: 51.5 };
    expect(hashRequest(a)).toBe(hashRequest(b));
  });

  it("produces different hashes for different inputs", () => {
    const a = { datetime: "2000-01-01T12:00:00Z", latitude: 51.5, longitude: -0.1 };
    const b = { datetime: "2000-01-01T12:00:00Z", latitude: 48.8, longitude: 2.35 };
    expect(hashRequest(a)).not.toBe(hashRequest(b));
  });

  it("includes optional fields in the hash", () => {
    const base: NatalRequest = { datetime: "2000-01-01T12:00:00Z", latitude: 51.5, longitude: -0.1 };
    const withSystem: NatalRequest = { ...base, house_system: HouseSystem.Placidus };
    expect(hashRequest(base)).not.toBe(hashRequest(withSystem));
  });
});

describe("chartKeys", () => {
  it("natal key starts with ['chart', 'natal']", () => {
    const req: NatalRequest = { datetime: "2000-01-01T12:00:00Z", latitude: 0, longitude: 0 };
    const key = chartKeys.natal(req);
    expect(key[0]).toBe("chart");
    expect(key[1]).toBe("natal");
    expect(key[2]).toBe(hashRequest(req));
  });
});
