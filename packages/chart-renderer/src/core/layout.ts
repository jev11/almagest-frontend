import { COLLISION } from "./constants.js";

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
export function resolveCollisions(
  positions: GlyphPosition[],
  radius: number,
  /** Fixed angles (radians) that repel labels but don't move — e.g. house cusp lines */
  blockers: number[] = [],
): GlyphPosition[] {
  if (positions.length <= 1) return positions.map((p) => ({ ...p }));

  // Work on a copy, do not mutate input
  const result: GlyphPosition[] = positions.map((p) => ({ ...p }));

  // Sort by original angle (ascending)
  result.sort((a, b) => a.originalAngle - b.originalAngle);

  const minGap = COLLISION.minGlyphGap;
  const maxDisp = COLLISION.maxDisplacement;
  // House cusp lines are thin — a smaller clearance is sufficient
  const blockerGap = Math.round(minGap * 0.5);

  // Convert pixel gap to angular gap at given radius
  const minAngularGap = minGap / radius; // radians
  const blockerAngularGap = blockerGap / radius; // radians
  const maxAngularDisp = maxDisp / radius; // radians

  for (let iter = 0; iter < COLLISION.iterations; iter++) {
    // Only push adjacent pairs (not circular wrap for simplicity)
    for (let i = 0; i < result.length - 1; i++) {
      const curr = result[i]!;
      const next = result[i + 1]!;

      const angleDiff = next.displayAngle - curr.displayAngle;
      const pixelDist = Math.abs(angleDiff) * radius;

      if (pixelDist < minGap) {
        const push = (minAngularGap - Math.abs(angleDiff)) / 2;
        // Push curr left (decreasing angle) and next right (increasing angle)
        curr.displayAngle -= push;
        next.displayAngle += push;
      }
    }

    // One-sided repulsion from fixed blocker angles (house cusps, etc.)
    for (const pos of result) {
      for (const blocker of blockers) {
        const diff = pos.displayAngle - blocker;
        const pixelDist = Math.abs(diff) * radius;
        if (pixelDist < blockerGap) {
          const push = blockerAngularGap - Math.abs(diff);
          // Push away from blocker; if exactly on it, push in increasing direction
          pos.displayAngle += (diff >= 0 ? 1 : -1) * push;
        }
      }
    }

    // Constrain each position to maxDisplacement from its original angle
    for (const pos of result) {
      const disp = pos.displayAngle - pos.originalAngle;
      if (Math.abs(disp) > maxAngularDisp) {
        pos.displayAngle = pos.originalAngle + Math.sign(disp) * maxAngularDisp;
      }
    }
  }

  // Mark displaced positions (use a small threshold to handle floating point)
  for (const pos of result) {
    const disp = Math.abs(pos.displayAngle - pos.originalAngle);
    pos.displaced = disp > 0.001;
  }

  return result;
}
