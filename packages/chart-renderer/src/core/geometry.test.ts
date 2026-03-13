import { describe, it, expect } from "vitest";
import {
  longitudeToAngle,
  polarToCartesian,
  angularDistance,
  normalizeLongitude,
  signIndexFromLongitude,
} from "./geometry.js";

describe("longitudeToAngle", () => {
  it("places Ascendant at 9 o'clock (π radians)", () => {
    // When longitude equals ascendant, the result should be π
    expect(longitudeToAngle(30, 30)).toBeCloseTo(Math.PI);
    expect(longitudeToAngle(0, 0)).toBeCloseTo(Math.PI);
    expect(longitudeToAngle(180, 180)).toBeCloseTo(Math.PI);
  });

  it("places Descendant at 3 o'clock (0 radians)", () => {
    // Descendant is ASC + 180°
    expect(longitudeToAngle(180, 0)).toBeCloseTo(0);
    expect(longitudeToAngle(210, 30)).toBeCloseTo(0);
  });

  it("wraps correctly around 360°", () => {
    // Longitude 360° should equal 0°
    const angle0 = longitudeToAngle(0, 0);
    const angle360 = longitudeToAngle(360, 0);
    expect(angle0).toBeCloseTo(angle360);
  });

  it("handles different ascendant values", () => {
    // With ASC at 90° and longitude at 90°, result should be π
    expect(longitudeToAngle(90, 90)).toBeCloseTo(Math.PI);
  });
});

describe("polarToCartesian", () => {
  it("converts angle 0 to right side of circle", () => {
    const { x, y } = polarToCartesian(0, 0, 0, 100);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  it("converts angle π/2 to top of circle (negative y due to canvas inversion)", () => {
    const { x, y } = polarToCartesian(0, 0, Math.PI / 2, 100);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-100);
  });

  it("converts angle π to left side of circle", () => {
    const { x, y } = polarToCartesian(0, 0, Math.PI, 100);
    expect(x).toBeCloseTo(-100);
    expect(y).toBeCloseTo(0);
  });

  it("handles zero radius", () => {
    const { x, y } = polarToCartesian(50, 50, Math.PI / 4, 0);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(50);
  });

  it("accounts for center offset", () => {
    const { x, y } = polarToCartesian(100, 100, 0, 50);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(100);
  });
});

describe("angularDistance", () => {
  it("returns 0 for identical longitudes", () => {
    expect(angularDistance(0, 0)).toBe(0);
    expect(angularDistance(180, 180)).toBe(0);
  });

  it("returns 180 for opposition", () => {
    expect(angularDistance(0, 180)).toBe(180);
    expect(angularDistance(90, 270)).toBe(180);
  });

  it("handles wrap-around (350° and 10°)", () => {
    expect(angularDistance(350, 10)).toBe(20);
    expect(angularDistance(10, 350)).toBe(20);
  });

  it("always returns value between 0 and 180", () => {
    for (let i = 0; i < 360; i += 15) {
      for (let j = 0; j < 360; j += 15) {
        const dist = angularDistance(i, j);
        expect(dist).toBeGreaterThanOrEqual(0);
        expect(dist).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("normalizeLongitude", () => {
  it("normalizes 360 to 0", () => {
    expect(normalizeLongitude(360)).toBe(0);
  });

  it("normalizes negative values", () => {
    expect(normalizeLongitude(-30)).toBeCloseTo(330);
  });

  it("leaves values in range unchanged", () => {
    expect(normalizeLongitude(180)).toBe(180);
    expect(normalizeLongitude(0)).toBe(0);
  });

  it("normalizes values > 360", () => {
    expect(normalizeLongitude(400)).toBeCloseTo(40);
  });
});

describe("signIndexFromLongitude", () => {
  it("returns 0 for Aries (0-29°)", () => {
    expect(signIndexFromLongitude(0)).toBe(0);
    expect(signIndexFromLongitude(29.9)).toBe(0);
  });

  it("returns 1 for Taurus (30-59°)", () => {
    expect(signIndexFromLongitude(30)).toBe(1);
    expect(signIndexFromLongitude(59.9)).toBe(1);
  });

  it("returns 11 for Pisces (330-359°)", () => {
    expect(signIndexFromLongitude(330)).toBe(11);
    expect(signIndexFromLongitude(359.9)).toBe(11);
  });

  it("handles boundary values correctly", () => {
    // Sign boundaries at 0, 30, 60, ..., 330
    for (let i = 0; i < 12; i++) {
      expect(signIndexFromLongitude(i * 30)).toBe(i);
    }
  });
});
