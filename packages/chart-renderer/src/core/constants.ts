import { AspectType } from "@astro-app/shared-types";

/**
 * Ring proportions as fractions of total radius.
 * These define the wheel anatomy from outside to inside.
 *
 * For a 300px radius wheel:
 *   cusp labels:  285-300px  (outermost, small text outside zodiac ring)
 *   zodiac ring:  235-285px  (sign segments, 0.783–0.95)
 *   planet ring:  210-235px  (planet glyphs + degree labels, 0.70–0.783)
 *   house zone:   0-210px    (house cusp lines)
 *   aspect zone:  0-114px    (aspect lines, 0.38 × 300)
 */
/** Fraction of total radius occupied by the zodiac sign ring outer edge. */
export const ZODIAC_OUTER = 0.95;

/**
 * Aspect circle radius as a fraction of ZODIAC_OUTER.
 * φ-based: planetInner / φ = 0.70 / 1.618 ≈ 0.433, then 0.433 / 0.95 ≈ 0.455
 */
export const ASPECT_CIRCLE_RATIO = 0.455;

/**
 * Ring proportions as fractions of total radius.
 * Zodiac ring width : planet ring width = φ (1.618).
 *   zodiac ring width = 0.95 - 0.796 = 0.154
 *   planet ring width = 0.796 - 0.70  = 0.096
 *   ratio = 0.154 / 0.096 ≈ 1.604 ≈ φ
 */
export const RING_PROPORTIONS = {
  labelOuter: 1.0,
  zodiacOuter: ZODIAC_OUTER,
  zodiacInner: 0.796,
  planetInner: 0.70,
  houseNumberOuter: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO + 0.07,
  houseInner: 0.15,
  aspectOuter: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO,
} as const;

/** Fibonacci base radius — glyph sizes are exact Fibonacci numbers at this radius. */
const GLYPH_BASE_RADIUS = 233;

/** Returns glyph font sizes scaled proportionally to the given wheel radius. Fibonacci at base. */
export function glyphSizes(radius: number) {
  const s = radius / GLYPH_BASE_RADIUS;
  return {
    planet: Math.round(13 * s),
    sign: Math.round(21 * s),
    degreeLabel: Math.round(8 * s),
    houseNumber: Math.round(13 * s),
  };
}

export const COLLISION = {
  minGlyphGap: 34,
  maxDisplacement: 55,
  iterations: 89,
} as const;

export const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  semi_sextile: 30,
  sextile: 60,
  square: 90,
  trine: 120,
  quincunx: 150,
  opposition: 180,
  semi_square: 45,
  sesquisquare: 135,
  quintile: 72,
  bi_quintile: 144,
};

export const MAJOR_ASPECTS = new Set<string>([
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
]);
