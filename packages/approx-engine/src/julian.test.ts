import { describe, it, expect } from "vitest";
import { dateToJulianDay, julianCenturies, normalizeDegrees } from "./julian.js";

describe("dateToJulianDay", () => {
  it("J2000.0 = JD 2451545.0", () => {
    // J2000.0 = 2000-01-01 12:00 UTC
    const j2000 = new Date("2000-01-01T12:00:00Z");
    expect(dateToJulianDay(j2000)).toBeCloseTo(2451545.0, 5);
  });

  it("Unix epoch = JD 2440587.5", () => {
    const unix = new Date(0);
    expect(dateToJulianDay(unix)).toBeCloseTo(2440587.5, 5);
  });
});

describe("julianCenturies", () => {
  it("returns 0 at J2000.0", () => {
    expect(julianCenturies(2451545.0)).toBe(0);
  });

  it("returns 1 one Julian century after J2000.0", () => {
    expect(julianCenturies(2451545.0 + 36525)).toBeCloseTo(1.0, 10);
  });
});

describe("normalizeDegrees", () => {
  it("keeps values in [0, 360)", () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(720)).toBe(0);
    expect(normalizeDegrees(-90)).toBeCloseTo(270, 10);
    expect(normalizeDegrees(361)).toBeCloseTo(1, 10);
  });
});
