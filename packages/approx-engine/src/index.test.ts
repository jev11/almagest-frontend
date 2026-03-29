import { describe, it, expect } from "vitest";
import { calculateApproximate, moonPhaseAngle, moonPhaseName } from "./index.js";
import { CelestialBody } from "@astro-app/shared-types";

// J2000.0
const J2000 = new Date("2000-01-01T12:00:00Z");

describe("calculateApproximate", () => {
  it("returns ChartData with all major bodies", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1);
    expect(chart.positions[CelestialBody.Sun]).toBeDefined();
    expect(chart.positions[CelestialBody.Moon]).toBeDefined();
    expect(chart.positions[CelestialBody.Mercury]).toBeDefined();
    expect(chart.positions[CelestialBody.Venus]).toBeDefined();
    expect(chart.positions[CelestialBody.Mars]).toBeDefined();
    expect(chart.positions[CelestialBody.Jupiter]).toBeDefined();
    expect(chart.positions[CelestialBody.Saturn]).toBeDefined();
    expect(chart.positions[CelestialBody.Uranus]).toBeDefined();
    expect(chart.positions[CelestialBody.Neptune]).toBeDefined();
    expect(chart.positions[CelestialBody.MeanNorthNode]).toBeDefined();
  });

  it("all longitudes are in [0, 360)", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1);
    for (const [, pos] of Object.entries(chart.positions)) {
      if (pos) {
        expect(pos.longitude).toBeGreaterThanOrEqual(0);
        expect(pos.longitude).toBeLessThan(360);
      }
    }
  });

  it("houses has 12 cusps", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1);
    expect(chart.houses.cusps).toHaveLength(12);
  });

  it("aspects are sorted by orb tightness", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1);
    for (let i = 1; i < chart.aspects.length; i++) {
      expect(chart.aspects[i]!.orb).toBeGreaterThanOrEqual(chart.aspects[i - 1]!.orb);
    }
  });
});

describe("moonPhaseAngle", () => {
  it("returns a value in [0, 360)", () => {
    const angle = moonPhaseAngle(J2000);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(360);
  });

  it("known Full Moon date has elongation near 180°", () => {
    // 2000-02-19 was a Full Moon
    const fullMoon = new Date("2000-02-19T16:27:00Z");
    const angle = moonPhaseAngle(fullMoon);
    // Allow ±15° tolerance for the approximation
    const dist = Math.abs(angle - 180);
    expect(Math.min(dist, 360 - dist)).toBeLessThan(15);
  });

  it("known New Moon date has elongation near 0°", () => {
    // 2000-02-05 was a New Moon
    const newMoon = new Date("2000-02-05T13:03:00Z");
    const angle = moonPhaseAngle(newMoon);
    const dist = Math.min(angle, 360 - angle);
    expect(dist).toBeLessThan(15);
  });
});

describe("moonPhaseName", () => {
  const cases: Array<[number, string]> = [
    [0, "New Moon"],
    [10, "New Moon"],
    [45, "Waxing Crescent"],
    [90, "First Quarter"],
    [135, "Waxing Gibbous"],
    [180, "Full Moon"],
    [225, "Waning Gibbous"],
    [270, "Last Quarter"],
    [315, "Waning Crescent"],
    [338, "New Moon"],
    [349, "New Moon"],
  ];

  for (const [angle, name] of cases) {
    it(`${angle}° → "${name}"`, () => {
      expect(moonPhaseName(angle)).toBe(name);
    });
  }
});

describe("Performance", () => {
  it("calculateApproximate runs in < 1ms", () => {
    const start = performance.now();
    calculateApproximate(J2000, 51.5, -0.1);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1);
  });
});
