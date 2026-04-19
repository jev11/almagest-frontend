import { describe, it, expect } from "vitest";
import {
  formatDegree,
  formatZodiacPosition,
  formatOrb,
  getMoonPhaseName,
  SIGN_GLYPHS,
  PLANET_GLYPHS,
  ASPECT_GLYPHS,
} from "../../../../../apps/web/src/lib/format";
import { ZodiacSign } from "@astro-app/shared-types";

describe("formatDegree", () => {
  it("formats whole degrees with zero minutes", () => {
    expect(formatDegree(15, 0)).toBe("15°00\u2032");
  });

  it("pads single-digit minutes", () => {
    expect(formatDegree(7, 5)).toBe("7°05\u2032");
  });

  it("formats two-digit minutes", () => {
    expect(formatDegree(29, 59)).toBe("29°59\u2032");
  });
});

describe("formatZodiacPosition", () => {
  it("includes sign glyph and degree", () => {
    const result = formatZodiacPosition(ZodiacSign.Aries, 15, 30);
    expect(result).toBe("♈ 15°30\u2032");
  });

  it("uses correct glyph for each sign", () => {
    expect(formatZodiacPosition(ZodiacSign.Taurus, 0, 0)).toContain("♉");
    expect(formatZodiacPosition(ZodiacSign.Scorpio, 0, 0)).toContain("♏");
  });
});

describe("formatOrb", () => {
  it("formats zero orb", () => {
    expect(formatOrb(0)).toBe("0°00\u2032");
  });

  it("formats fractional degrees to minutes", () => {
    expect(formatOrb(1.5)).toBe("1°30\u2032");
  });

  it("formats orb with rounding", () => {
    expect(formatOrb(2.25)).toBe("2°15\u2032");
  });
});

describe("getMoonPhaseName", () => {
  it("returns New Moon near 0°", () => {
    expect(getMoonPhaseName(0)).toBe("New Moon");
    expect(getMoonPhaseName(10)).toBe("New Moon");
  });

  it("returns Waxing Crescent near 45°", () => {
    expect(getMoonPhaseName(45)).toBe("Waxing Crescent");
  });

  it("returns First Quarter near 90°", () => {
    expect(getMoonPhaseName(90)).toBe("First Quarter");
  });

  it("returns Waxing Gibbous near 135°", () => {
    expect(getMoonPhaseName(135)).toBe("Waxing Gibbous");
  });

  it("returns Full Moon near 180°", () => {
    expect(getMoonPhaseName(180)).toBe("Full Moon");
  });

  it("returns Waning Gibbous near 225°", () => {
    expect(getMoonPhaseName(225)).toBe("Waning Gibbous");
  });

  it("returns Last Quarter near 270°", () => {
    expect(getMoonPhaseName(270)).toBe("Last Quarter");
  });

  it("returns Waning Crescent near 315°", () => {
    expect(getMoonPhaseName(315)).toBe("Waning Crescent");
  });

  it("returns New Moon near 360° (wraps)", () => {
    expect(getMoonPhaseName(350)).toBe("New Moon");
  });

  it("handles negative elongation", () => {
    expect(getMoonPhaseName(-10)).toBe("New Moon");
  });
});

describe("SIGN_GLYPHS", () => {
  it("has all 12 signs", () => {
    expect(Object.keys(SIGN_GLYPHS)).toHaveLength(12);
  });

  it("has correct glyphs", () => {
    expect(SIGN_GLYPHS[ZodiacSign.Aries]).toBe("♈");
    expect(SIGN_GLYPHS[ZodiacSign.Pisces]).toBe("♓");
  });
});

describe("PLANET_GLYPHS", () => {
  it("includes sun and moon", () => {
    expect(PLANET_GLYPHS["sun"]).toBe("☉");
    expect(PLANET_GLYPHS["moon"]).toBe("☽");
  });
});

describe("ASPECT_GLYPHS", () => {
  it("includes major aspects", () => {
    expect(ASPECT_GLYPHS["conjunction"]).toBe("☌");
    expect(ASPECT_GLYPHS["opposition"]).toBe("☍");
    expect(ASPECT_GLYPHS["trine"]).toBe("△");
    expect(ASPECT_GLYPHS["square"]).toBe("□");
  });
});
