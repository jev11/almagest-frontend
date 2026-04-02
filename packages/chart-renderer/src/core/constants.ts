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

/** Aspect circle radius as a fraction of total radius. Expressed as a ratio of ZODIAC_OUTER. */
export const ASPECT_CIRCLE_RATIO = 0.40;

export const RING_PROPORTIONS = {
  labelOuter: 1.0,
  zodiacOuter: ZODIAC_OUTER,
  zodiacInner: 0.783,
  planetInner: 0.70,
  houseNumberOuter: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO + 0.07,
  houseInner: 0.15,
  aspectOuter: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO,
} as const;

/** Base radius the original pixel sizes were designed for. */
const GLYPH_BASE_RADIUS = 300;

/** Returns glyph font sizes scaled proportionally to the given wheel radius. */
export function glyphSizes(radius: number) {
  const s = radius / GLYPH_BASE_RADIUS;
  return {
    planet:      Math.round(18 * s),
    sign:        Math.round(20 * s),
    degreeLabel: Math.round(11 * s),
    houseNumber: Math.round(13 * s),
  };
}

export const COLLISION = {
  minGlyphGap: 25,
  maxDisplacement: 70,
  iterations: 80,
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
