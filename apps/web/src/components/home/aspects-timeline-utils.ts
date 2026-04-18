import { calculateBodyPosition } from "@astro-app/approx-engine";
import type { CelestialBody } from "@astro-app/shared-types";

/**
 * Indices of strict local maxima in a sample array. Plateaus are reported at
 * their leftmost index. Boundary indices (0, n-1) are included if the single
 * adjacent neighbour is lower.
 */
export function findLocalMaxIndices(samples: number[]): number[] {
  const out: number[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const v = samples[i]!;
    if (v <= 0) continue;
    const prev = i > 0 ? samples[i - 1]! : -Infinity;
    const next = i < n - 1 ? samples[i + 1]! : -Infinity;
    if (v >= prev && v >= next && (v > prev || v > next)) {
      out.push(i);
    }
  }
  return out;
}

/**
 * Converts an orb value to an intensity in [0, 1].
 * intensity = 1 at orb = 0 (exact aspect), 0 at orb = maxOrb.
 */
export function orbIntensity(orb: number, maxOrb: number): number {
  if (maxOrb <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - orb / maxOrb));
}

const GOLDEN_R = (Math.sqrt(5) - 1) / 2; // ~0.618034
const CONVERGENCE_MS = 30_000; // 30 seconds
const MAX_ITER = 30;

/**
 * Golden-section minimization of orbAtTime(t) across [bracketStartMs,
 * bracketEndMs]. Returns the converged peak time and orb at that time.
 */
export function refinePeakTime(
  bracketStartMs: number,
  bracketEndMs: number,
  body1: CelestialBody,
  body2: CelestialBody,
  aspectAngle: number,
): { ms: number; orb: number } {
  let a = bracketStartMs;
  let b = bracketEndMs;
  let x1 = a + (1 - GOLDEN_R) * (b - a);
  let x2 = a + GOLDEN_R * (b - a);
  let f1 = orbAtTime(x1, body1, body2, aspectAngle);
  let f2 = orbAtTime(x2, body1, body2, aspectAngle);

  for (let i = 0; i < MAX_ITER; i++) {
    if (b - a < CONVERGENCE_MS) break;
    if (f1 > f2) {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + GOLDEN_R * (b - a);
      f2 = orbAtTime(x2, body1, body2, aspectAngle);
    } else {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = a + (1 - GOLDEN_R) * (b - a);
      f1 = orbAtTime(x1, body1, body2, aspectAngle);
    }
  }

  const mid = (a + b) / 2;
  return { ms: mid, orb: orbAtTime(mid, body1, body2, aspectAngle) };
}

const WIDEN_CAP_MS = 180 * 24 * 3600 * 1000; // 6 months
const WIDEN_MAX_STEPS = 25;

/**
 * Bisects `orb(t) = maxOrb` on one side of a known peak. `side` selects
 * whether to search before (`"left"`) or after (`"right"`) the peak.
 *
 * Pre-condition: `peakOrb < maxOrb` (peak is inside orb). The caller
 * supplies a candidate outer edge; if that edge is still inside orb (i.e.
 * the aspect extends past it), the function exponentially widens the
 * bracket away from the peak up to `WIDEN_CAP_MS`. If the bracket cannot
 * be made to straddle `maxOrb` within the cap, returns `{ clipped: true }`
 * with `ms` set to the cap edge.
 *
 * A 3-point monotonicity check on the bracket guards against retrograde
 * reversals inside the active window. If non-monotonic, the local maximum
 * of `orb(t)` is located via golden-section and used as the new outer
 * bracket so the first crossing (nearest the peak) is still captured.
 */
export function findOrbCrossing(
  side: "left" | "right",
  peakMs: number,
  peakOrb: number,
  outerCandidateMs: number,
  maxOrb: number,
  body1: CelestialBody,
  body2: CelestialBody,
  aspectAngle: number,
): { ms: number; clipped: boolean } {
  const direction = side === "left" ? -1 : 1;

  let outerMs = outerCandidateMs;
  let outerOrb = orbAtTime(outerMs, body1, body2, aspectAngle);

  // Widening loop: double the distance from peak until out of orb or capped.
  let step = 0;
  while (outerOrb < maxOrb && step < WIDEN_MAX_STEPS) {
    const distance = Math.max(Math.abs(outerMs - peakMs), 6 * 3600 * 1000);
    const nextDistance = distance * 2;
    if (nextDistance > WIDEN_CAP_MS) {
      return { ms: peakMs + direction * WIDEN_CAP_MS, clipped: true };
    }
    outerMs = peakMs + direction * nextDistance;
    outerOrb = orbAtTime(outerMs, body1, body2, aspectAngle);
    step++;
  }

  if (outerOrb < maxOrb) {
    return { ms: peakMs + direction * WIDEN_CAP_MS, clipped: true };
  }

  // Bracket [innerMs ↔ outerMs] straddles maxOrb. Normalise so we bisect
  // with `low` = in-orb side, `high` = out-of-orb side.
  let innerMs = peakMs;
  const innerOrb = peakOrb;

  // 3-point monotonicity check at 25/50/75% of bracket.
  const p25ms = innerMs + (outerMs - innerMs) * 0.25;
  const p50ms = innerMs + (outerMs - innerMs) * 0.5;
  const p75ms = innerMs + (outerMs - innerMs) * 0.75;
  const p25o = orbAtTime(p25ms, body1, body2, aspectAngle);
  const p50o = orbAtTime(p50ms, body1, body2, aspectAngle);
  const p75o = orbAtTime(p75ms, body1, body2, aspectAngle);

  const EPS = 1e-9;
  const monotonic =
    innerOrb <= p25o + EPS &&
    p25o <= p50o + EPS &&
    p50o <= p75o + EPS &&
    p75o <= outerOrb + EPS;

  if (!monotonic) {
    // Golden-section maximization of orb(t) across [innerMs, outerMs].
    let a = innerMs;
    let b = outerMs;
    let x1 = a + (1 - GOLDEN_R) * (b - a);
    let x2 = a + GOLDEN_R * (b - a);
    let f1 = orbAtTime(x1, body1, body2, aspectAngle);
    let f2 = orbAtTime(x2, body1, body2, aspectAngle);
    for (let i = 0; i < MAX_ITER; i++) {
      if (Math.abs(b - a) < CONVERGENCE_MS) break;
      if (f1 < f2) {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = a + GOLDEN_R * (b - a);
        f2 = orbAtTime(x2, body1, body2, aspectAngle);
      } else {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = a + (1 - GOLDEN_R) * (b - a);
        f1 = orbAtTime(x1, body1, body2, aspectAngle);
      }
    }
    const inflectionMs = (a + b) / 2;
    const inflectionOrb = orbAtTime(inflectionMs, body1, body2, aspectAngle);

    if (inflectionOrb >= maxOrb) {
      // Inner-to-inflection segment contains the first crossing.
      outerMs = inflectionMs;
      outerOrb = inflectionOrb;
    }
  }

  // Bisection.
  for (let i = 0; i < MAX_ITER; i++) {
    if (Math.abs(outerMs - innerMs) < CONVERGENCE_MS) break;
    const midMs = (innerMs + outerMs) / 2;
    const midOrb = orbAtTime(midMs, body1, body2, aspectAngle);
    if (midOrb < maxOrb) {
      innerMs = midMs;
    } else {
      outerMs = midMs;
      outerOrb = midOrb;
    }
  }

  return { ms: outerMs, clipped: false };
}

/**
 * Angular distance between two bodies' longitudes minus the target aspect
 * angle, both folded onto [0, 180]. Returns degrees. A return value of 0
 * means the aspect is exact; returns > maxOrb mean the aspect is not in
 * orb.
 */
export function orbAtTime(
  ms: number,
  body1: CelestialBody,
  body2: CelestialBody,
  aspectAngle: number,
): number {
  const date = new Date(ms);
  const p1 = calculateBodyPosition(date, body1);
  const p2 = calculateBodyPosition(date, body2);
  const raw = Math.abs(p1.longitude - p2.longitude);
  const sep = raw > 180 ? 360 - raw : raw;
  return Math.abs(sep - aspectAngle);
}
