export interface GlyphPosition {
    /** Celestial body identifier */
    body: string;
    /** Original angle (from longitude) in radians */
    originalAngle: number;
    /** Display angle after collision avoidance in radians */
    displayAngle: number;
    /** Whether this position was displaced from original */
    displaced: boolean;
}
/**
 * Resolve overlapping glyph positions using a spring-force algorithm.
 *
 * Algorithm:
 * 1. Sort positions by original angle
 * 2. Calculate arc-distance between adjacent glyphs at the given radius
 * 3. If distance < minGlyphGap: apply repulsion force between overlapping pair
 * 4. Constrain displacement to maxDisplacement from original position
 * 5. Repeat for `iterations` steps
 * 6. Mark displaced positions (they'll need leader lines)
 *
 * @param positions - Array of glyph positions with original angles
 * @param radius - Radius of the planet ring (for pixel distance calculation)
 * @returns Updated positions with displayAngle set (input is not mutated)
 */
export declare function resolveCollisions(positions: GlyphPosition[], radius: number): GlyphPosition[];
//# sourceMappingURL=layout.d.ts.map