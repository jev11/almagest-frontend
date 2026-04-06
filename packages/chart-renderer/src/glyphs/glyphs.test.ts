import { describe, it, expect } from "vitest";
import { PLANET_PATHS, PLANET_WIDTHS } from "./planet-paths.js";
import { SIGN_PATHS, SIGN_WIDTHS } from "./sign-paths.js";
import { ASPECT_PATHS, ASPECT_WIDTHS } from "./aspect-paths.js";
import { CelestialBody, ZodiacSign, AspectType } from "@astro-app/shared-types";

function allEnumValues(enumObj: Record<string, string>): string[] {
  return Object.values(enumObj);
}

const hasPath2D = typeof globalThis.Path2D !== "undefined";

describe("PLANET_PATHS", () => {
  const bodies = allEnumValues(CelestialBody);

  it("has a path for every CelestialBody enum value", () => {
    for (const body of bodies) {
      expect(PLANET_PATHS).toHaveProperty(body);
      expect(PLANET_PATHS[body]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every CelestialBody enum value", () => {
    for (const body of bodies) {
      expect(PLANET_WIDTHS).toHaveProperty(body);
      expect(PLANET_WIDTHS[body]).toBeGreaterThanOrEqual(0.1);
      expect(PLANET_WIDTHS[body]).toBeLessThanOrEqual(1.0);
    }
  });

  it.skipIf(!hasPath2D)("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(PLANET_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for planet "${key}"`).not.toThrow();
    }
  });
});

describe("SIGN_PATHS", () => {
  const signs = allEnumValues(ZodiacSign);

  it("has a path for every ZodiacSign enum value", () => {
    for (const sign of signs) {
      expect(SIGN_PATHS).toHaveProperty(sign);
      expect(SIGN_PATHS[sign]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every ZodiacSign enum value", () => {
    for (const sign of signs) {
      expect(SIGN_WIDTHS).toHaveProperty(sign);
      expect(SIGN_WIDTHS[sign]).toBeGreaterThanOrEqual(0.1);
      expect(SIGN_WIDTHS[sign]).toBeLessThanOrEqual(1.0);
    }
  });

  it.skipIf(!hasPath2D)("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(SIGN_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for sign "${key}"`).not.toThrow();
    }
  });
});

describe("ASPECT_PATHS", () => {
  const aspects = allEnumValues(AspectType);

  it("has a path for every AspectType enum value", () => {
    for (const aspect of aspects) {
      expect(ASPECT_PATHS).toHaveProperty(aspect);
      expect(ASPECT_PATHS[aspect]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every AspectType enum value", () => {
    for (const aspect of aspects) {
      expect(ASPECT_WIDTHS).toHaveProperty(aspect);
      expect(ASPECT_WIDTHS[aspect]).toBeGreaterThanOrEqual(0.1);
      expect(ASPECT_WIDTHS[aspect]).toBeLessThanOrEqual(1.0);
    }
  });

  it.skipIf(!hasPath2D)("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(ASPECT_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for aspect "${key}"`).not.toThrow();
    }
  });
});
