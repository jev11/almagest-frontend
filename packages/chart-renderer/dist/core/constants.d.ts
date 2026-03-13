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
export declare const RING_PROPORTIONS: {
    readonly labelOuter: 1;
    readonly zodiacOuter: 0.9;
    readonly zodiacInner: 0.783;
    readonly planetInner: 0.7;
    readonly houseInner: 0.15;
    readonly aspectOuter: 0.6;
};
export declare const GLYPH_SIZES: {
    readonly planet: 18;
    readonly sign: 16;
    readonly degreeLabel: 11;
    readonly houseNumber: 13;
};
export declare const COLLISION: {
    readonly minGlyphGap: 20;
    readonly maxDisplacement: 40;
    readonly iterations: 50;
};
export declare const ASPECT_ANGLES: Record<string, number>;
export declare const MAJOR_ASPECTS: Set<string>;
//# sourceMappingURL=constants.d.ts.map