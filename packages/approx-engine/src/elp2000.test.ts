import { describe, it, expect } from "vitest";
import { calculateMoonPosition } from "./elp2000.js";

// J2000.0 = T = 0
const T0 = 0;

describe("Moon at J2000.0", () => {
  it("longitude is within 3° of corrected value ~223.3°", () => {
    const moon = calculateMoonPosition(T0);
    // Moon mean longitude at J2000.0 = 218.316°; after ELP2000 corrections ≈ 223.3°
    // (primary correction: 6288774 * sin(134.96°) / 1e6 ≈ +4.95°)
    expect(moon.longitude).toBeGreaterThan(210);
    expect(moon.longitude).toBeLessThan(236);
    expect(Math.abs(moon.longitude - 223.3)).toBeLessThan(3);
  });

  it("longitude is in [0, 360)", () => {
    const moon = calculateMoonPosition(T0);
    expect(moon.longitude).toBeGreaterThanOrEqual(0);
    expect(moon.longitude).toBeLessThan(360);
  });

  it("latitude is within ±5.3°", () => {
    const moon = calculateMoonPosition(T0);
    expect(Math.abs(moon.latitude)).toBeLessThan(5.3);
  });

  it("distance is ~60 Earth radii", () => {
    const moon = calculateMoonPosition(T0);
    // Moon distance ranges 55.9 to 63.8 Earth radii
    expect(moon.distance).toBeGreaterThan(55);
    expect(moon.distance).toBeLessThan(65);
  });

  it("speed is approximately 13.2°/day", () => {
    const moon = calculateMoonPosition(T0);
    expect(moon.speed).toBeGreaterThan(11.5);
    expect(moon.speed).toBeLessThan(15.0);
  });
});
