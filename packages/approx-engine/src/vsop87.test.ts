import { describe, it, expect } from "vitest";
import { calculateSunPosition, calculatePlanetPosition, PLANET_BODIES } from "./vsop87.js";

// J2000.0 = T = 0
const T0 = 0;

describe("Sun at J2000.0", () => {
  it("longitude is within 6 arcminutes of 280.46°", () => {
    const sun = calculateSunPosition(T0);
    // Known value: Sun geocentric ecliptic longitude at J2000.0 ≈ 280.46°
    expect(sun.longitude).toBeGreaterThan(280.0);
    expect(sun.longitude).toBeLessThan(281.0);
    // Within 6 arcminutes (0.1°) — this truncated Keplerian model
    expect(Math.abs(sun.longitude - 280.46)).toBeLessThan(0.1);
  });

  it("latitude is near 0", () => {
    const sun = calculateSunPosition(T0);
    // Sun geocentric ecliptic latitude is nearly 0 (tiny residual from Earth's inclination)
    expect(Math.abs(sun.latitude)).toBeLessThan(0.01);
  });

  it("distance is near 0.9833 AU (perihelion is in early January)", () => {
    const sun = calculateSunPosition(T0);
    // Earth is near perihelion in early January, distance ≈ 0.983 AU
    expect(sun.distance).toBeGreaterThan(0.97);
    expect(sun.distance).toBeLessThan(1.02);
  });

  it("speed is approximately 1°/day", () => {
    const sun = calculateSunPosition(T0);
    expect(sun.speed).toBeGreaterThan(0.95);
    expect(sun.speed).toBeLessThan(1.03);
  });
});

describe("Planets at J2000.0", () => {
  it("all PLANET_BODIES are calculable without throwing", () => {
    for (const body of PLANET_BODIES) {
      expect(() => calculatePlanetPosition(T0, body)).not.toThrow();
    }
  });

  it("all planet longitudes are in [0, 360)", () => {
    for (const body of PLANET_BODIES) {
      const pos = calculatePlanetPosition(T0, body);
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
    }
  });

  it("all planet distances are positive", () => {
    for (const body of PLANET_BODIES) {
      const pos = calculatePlanetPosition(T0, body);
      expect(pos.distance).toBeGreaterThan(0);
    }
  });

  it("Mercury speed is fastest among planets (>1 deg/day)", () => {
    // Geocentric speed at J2000.0 depends on relative geometry; still fastest planet
    const mercury = calculatePlanetPosition(T0, PLANET_BODIES[0]!);
    expect(mercury.speed).toBeGreaterThan(1);
  });

  it("Neptune speed is slowest (<0.1 deg/day)", () => {
    const neptune = calculatePlanetPosition(T0, PLANET_BODIES[6]!);
    expect(Math.abs(neptune.speed)).toBeLessThan(0.1);
  });
});
