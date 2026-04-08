import { COLLISION } from "./constants.js";

const TWO_PI = 2 * Math.PI;

/**
 * Signed angular difference (a - b) on a circle, result in (-π, π].
 * Positive means a is counter-clockwise from b.
 */
function circularDiff(a: number, b: number): number {
  let d = ((a - b) % TWO_PI + TWO_PI + Math.PI) % TWO_PI - Math.PI;
  return d;
}

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
  /** Wide blockers that need full minGlyphGap clearance — e.g. angle labels (AS/DS/MC/IC) */
  wideBlockers: number[] = [],
): GlyphPosition[] {
  if (positions.length <= 1 && blockers.length === 0 && wideBlockers.length === 0)
    return positions.map((p) => ({ ...p }));

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
    // Push adjacent pairs apart if they overlap
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

    // Circular wrap-around: check last vs first (across 0°/2π boundary)
    if (result.length >= 2) {
      const last = result[result.length - 1]!;
      const first = result[0]!;
      const wrapDiff = (first.displayAngle + 2 * Math.PI) - last.displayAngle;
      const wrapPixelDist = wrapDiff * radius;

      if (wrapPixelDist < minGap) {
        const push = (minAngularGap - wrapDiff) / 2;
        last.displayAngle -= push;
        first.displayAngle += push;
      }
    }

    // One-sided repulsion from fixed blocker angles (house cusps, etc.)
    for (const pos of result) {
      for (const blocker of blockers) {
        const diff = circularDiff(pos.displayAngle, blocker);
        const pixelDist = Math.abs(diff) * radius;
        if (pixelDist < blockerGap) {
          const push = blockerAngularGap - Math.abs(diff);
          // Push away from blocker; if exactly on it, push in increasing direction
          pos.displayAngle += (diff >= 0 ? 1 : -1) * push;
        }
      }
    }

    // One-sided repulsion from wide blocker angles (angle labels AS/DS/MC/IC)
    // When multiple wide blockers overlap, push away from each one but always
    // in the same direction (determined by the nearest blocker) to avoid
    // ping-pong between adjacent zones.
    // Uses circularDiff to handle wrap-around (e.g. planet at ~3π near AS at ~π).
    for (const pos of result) {
      // Find the nearest encroaching wide blocker to set the push direction
      let nearestDiff: number | null = null;
      let nearestAbsDiff = Infinity;
      for (const blocker of wideBlockers) {
        const diff = circularDiff(pos.displayAngle, blocker);
        const absDiff = Math.abs(diff);
        if (absDiff * radius < minGap && absDiff < nearestAbsDiff) {
          nearestAbsDiff = absDiff;
          nearestDiff = diff;
        }
      }
      if (nearestDiff !== null) {
        const dir = nearestDiff >= 0 ? 1 : -1;
        // Push away from every encroaching wide blocker in that same direction
        for (const blocker of wideBlockers) {
          const diff = circularDiff(pos.displayAngle, blocker);
          const pixelDist = Math.abs(diff) * radius;
          if (pixelDist < minGap) {
            const push = minAngularGap - Math.abs(diff);
            pos.displayAngle += dir * push;
          }
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
