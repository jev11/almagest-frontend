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

describe("calculateApproximate with options", () => {
  it("orbOverrides reduce aspects when orbs are tightened", () => {
    const defaultChart = calculateApproximate(J2000, 51.5, -0.1);
    const tightChart = calculateApproximate(J2000, 51.5, -0.1, {
      orbOverrides: {
        conjunction: 1, opposition: 1, trine: 1, square: 1, sextile: 1, quincunx: 1,
      },
    });
    expect(tightChart.aspects.length).toBeLessThan(defaultChart.aspects.length);
  });

  it("orbOverrides widen aspects when orbs are increased", () => {
    const defaultChart = calculateApproximate(J2000, 51.5, -0.1);
    const wideChart = calculateApproximate(J2000, 51.5, -0.1, {
      orbOverrides: {
        conjunction: 15, opposition: 15, trine: 15, square: 15, sextile: 15, quincunx: 15,
      },
    });
    expect(wideChart.aspects.length).toBeGreaterThanOrEqual(defaultChart.aspects.length);
  });

  it("orbOverride of 0 disables that aspect type", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1, {
      orbOverrides: { conjunction: 0 },
    });
    const hasConjunction = chart.aspects.some((a) => a.type === "conjunction");
    expect(hasConjunction).toBe(false);
  });

  it("partial orbOverrides only affect specified types", () => {
    const defaultChart = calculateApproximate(J2000, 51.5, -0.1);
    const partialChart = calculateApproximate(J2000, 51.5, -0.1, {
      orbOverrides: { conjunction: 8 }, // same as default
    });
    // Should produce the same aspects since override matches default
    expect(partialChart.aspects.length).toBe(defaultChart.aspects.length);
  });

  it("includeMinor adds minor aspect types", () => {
    const majorOnly = calculateApproximate(J2000, 51.5, -0.1);
    const withMinor = calculateApproximate(J2000, 51.5, -0.1, { includeMinor: true });
    expect(withMinor.aspects.length).toBeGreaterThanOrEqual(majorOnly.aspects.length);

    const minorTypes = new Set(["semi_square", "sesquiquadrate", "semi_sextile"]);
    const majorHasMinor = majorOnly.aspects.some((a) => minorTypes.has(a.type));
    expect(majorHasMinor).toBe(false);
  });

  it("includeMinor respects orbOverrides for minor types", () => {
    const withMinor = calculateApproximate(J2000, 51.5, -0.1, {
      includeMinor: true,
      orbOverrides: { semi_square: 0, sesquiquadrate: 0, semi_sextile: 0 },
    });
    const minorTypes = new Set(["semi_square", "sesquiquadrate", "semi_sextile"]);
    const hasMinor = withMinor.aspects.some((a) => minorTypes.has(a.type));
    expect(hasMinor).toBe(false);
  });

  it("aspects still sorted by orb with options", () => {
    const chart = calculateApproximate(J2000, 51.5, -0.1, {
      orbOverrides: { conjunction: 12, trine: 12 },
      includeMinor: true,
    });
    for (let i = 1; i < chart.aspects.length; i++) {
      expect(chart.aspects[i]!.orb).toBeGreaterThanOrEqual(chart.aspects[i - 1]!.orb);
    }
  });
});

describe("Performance", () => {
  it("calculateApproximate runs in < 1ms", () => {
    const start = performance.now();
    calculateApproximate(J2000, 51.5, -0.1);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1);
  });
});
