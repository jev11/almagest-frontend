import { AspectType } from "@astro-app/shared-types";

/**
 * Ring proportions as fractions of total radius.
 * These define the wheel anatomy from outside to inside.
 *
 * For a 300px radius wheel:
 *   label ring:   270-300px  (outermost, planet degree labels)
 *   zodiac ring:  235-270px  (sign segments)
 *   planet ring:  210-235px  (planet glyphs)
 *   house zone:   0-210px    (house cusp lines)
 *   aspect zone:  0-180px    (aspect lines)
 */
/** Fraction of total radius occupied by the zodiac sign ring outer edge. */
export const ZODIAC_OUTER = 0.90;

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

export const GLYPH_SIZES = {
  planet: 18,
  sign: 20,
  degreeLabel: 11,
  houseNumber: 13,
} as const;

export const COLLISION = {
  minGlyphGap: 15,
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
