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
export const RING_PROPORTIONS = {
    labelOuter: 1.0,
    zodiacOuter: 0.90,
    zodiacInner: 0.783,
    planetInner: 0.70,
    houseInner: 0.15,
    aspectOuter: 0.60,
};
export const GLYPH_SIZES = {
    planet: 18,
    sign: 16,
    degreeLabel: 11,
    houseNumber: 13,
};
export const COLLISION = {
    minGlyphGap: 20,
    maxDisplacement: 40,
    iterations: 50,
};
export const ASPECT_ANGLES = {
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
export const MAJOR_ASPECTS = new Set([
    AspectType.Conjunction,
    AspectType.Sextile,
    AspectType.Square,
    AspectType.Trine,
    AspectType.Opposition,
]);
//# sourceMappingURL=constants.js.map