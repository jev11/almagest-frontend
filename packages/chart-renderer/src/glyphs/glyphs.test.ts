import { describe, it, expect } from "vitest";
import { PLANET_GLYPHS } from "./planet-glyphs.js";
import { SIGN_GLYPHS } from "./sign-glyphs.js";
import { ASPECT_GLYPHS } from "./aspect-glyphs.js";
import { CelestialBody, ZodiacSign, AspectType } from "@astro-app/shared-types";

function allEnumValues(enumObj: Record<string, string>): string[] {
  return Object.values(enumObj);
}

describe("PLANET_GLYPHS", () => {
  const bodies = allEnumValues(CelestialBody);

  it("has a glyph for every CelestialBody enum value", () => {
    for (const body of bodies) {
      expect(PLANET_GLYPHS).toHaveProperty(body);
      expect(PLANET_GLYPHS[body]!.length).toBeGreaterThan(0);
    }
  });
});

describe("SIGN_GLYPHS", () => {
  const signs = allEnumValues(ZodiacSign);

  it("has a glyph for every ZodiacSign enum value", () => {
    for (const sign of signs) {
      expect(SIGN_GLYPHS).toHaveProperty(sign);
      expect(SIGN_GLYPHS[sign]!.length).toBeGreaterThan(0);
    }
  });
});

describe("ASPECT_GLYPHS", () => {
  const aspects = allEnumValues(AspectType);

  it("has a glyph for every AspectType enum value", () => {
    for (const aspect of aspects) {
      expect(ASPECT_GLYPHS).toHaveProperty(aspect);
      expect(ASPECT_GLYPHS[aspect]!.length).toBeGreaterThan(0);
    }
  });
});
