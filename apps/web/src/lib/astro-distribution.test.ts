import { describe, expect, it } from "vitest";
import { CelestialBody, ZodiacSign, Element } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { SIGN_MODALITY, computeDistribution, dominantKeys } from "./astro-distribution";

function makeChart(
  positions: Partial<Record<CelestialBody, ZodiacSign>>,
): ChartData {
  const zodiac_positions = Object.fromEntries(
    Object.entries(positions).map(([body, sign]) => [
      body,
      { sign, degree: 0, longitude: 0 },
    ]),
  ) as ChartData["zodiac_positions"];
  return { zodiac_positions } as ChartData;
}

describe("SIGN_MODALITY", () => {
  it("maps the four cardinal signs to cardinal", () => {
    expect(SIGN_MODALITY[ZodiacSign.Aries]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Cancer]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Libra]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Capricorn]).toBe("Cardinal");
  });

  it("maps the four fixed signs to fixed", () => {
    expect(SIGN_MODALITY[ZodiacSign.Taurus]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Leo]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Scorpio]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Aquarius]).toBe("Fixed");
  });

  it("maps the four mutable signs to mutable", () => {
    expect(SIGN_MODALITY[ZodiacSign.Gemini]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Virgo]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Sagittarius]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Pisces]).toBe("Mutable");
  });
});

describe("computeDistribution", () => {
  it("tallies elements and modalities for the requested bodies", () => {
    const chart = makeChart({
      [CelestialBody.Sun]: ZodiacSign.Aries,     // Fire / Cardinal
      [CelestialBody.Moon]: ZodiacSign.Taurus,   // Earth / Fixed
      [CelestialBody.Mercury]: ZodiacSign.Leo,   // Fire / Fixed
    });

    const dist = computeDistribution(chart, [
      CelestialBody.Sun,
      CelestialBody.Moon,
      CelestialBody.Mercury,
    ]);

    expect(dist.total).toBe(3);
    expect(dist.elements.get(Element.Fire)).toBe(2);
    expect(dist.elements.get(Element.Earth)).toBe(1);
    expect(dist.modalities.get("Cardinal")).toBe(1);
    expect(dist.modalities.get("Fixed")).toBe(2);
    expect(dist.elements.get(Element.Air)).toBeUndefined();
    expect(dist.elements.get(Element.Water)).toBeUndefined();
    expect(dist.modalities.get("Mutable")).toBeUndefined();
  });

  it("counts all requested bodies toward total even when position data is absent", () => {
    const chart = makeChart({
      [CelestialBody.Sun]: ZodiacSign.Aries,
    });

    const dist = computeDistribution(chart, [
      CelestialBody.Sun,
      CelestialBody.Moon,
    ]);

    expect(dist.total).toBe(2);
    expect(dist.elements.get(Element.Fire)).toBe(1);
    expect(dist.elements.get(Element.Earth)).toBeUndefined();
    expect(dist.modalities.get("Cardinal")).toBe(1);
    expect(dist.modalities.size).toBe(1);
  });
});

describe("dominantKeys", () => {
  it("returns the single key with the highest count", () => {
    const map = new Map<string, number>([
      ["a", 1],
      ["b", 3],
      ["c", 2],
    ]);
    expect(dominantKeys(map)).toEqual(["b"]);
  });

  it("returns every key tied for the highest count in insertion order", () => {
    const map = new Map<string, number>([
      ["a", 2],
      ["b", 3],
      ["c", 3],
    ]);
    expect(dominantKeys(map)).toEqual(["b", "c"]);
  });

  it("returns an empty array for an empty map", () => {
    expect(dominantKeys(new Map())).toEqual([]);
  });

  it("ignores zero-count entries", () => {
    const map = new Map<string, number>([
      ["a", 0],
      ["b", 0],
    ]);
    expect(dominantKeys(map)).toEqual([]);
  });
});
