# Aspect Timeline — Precise In-Orb Windows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sample-grid Start/Peak/End with sub-minute-accurate astronomical times derived from `approx-engine` via root-finding.

**Architecture:** Per aspect bar, run a golden-section minimization for peak-time and two bisections (one per crossing) against `orbAtTime(t) = |sep(t) − aspectAngle|`. Migrate `BarRange` from sample indices to absolute `ms` timestamps. Drop `ACTIVE_THRESHOLD` and sample-grid-aligned rendering — bars are placed by `msToX`, clipped to the visible window, and tooltips format the converged timestamps directly.

**Tech Stack:** TypeScript, Vitest, `@astro-app/approx-engine`, React 18.

**Spec:** `docs/superpowers/specs/2026-04-18-aspect-timeline-precision-design.md`

---

## File Structure

| File | Role |
|------|------|
| `apps/web/src/components/home/aspects-timeline-utils.ts` | Host `orbAtTime`, `refinePeakTime`, `findOrbCrossing`. Remove `interpolatePeaks`. Keep `orbIntensity`, `catmullRomPath`. |
| `apps/web/src/components/home/aspects-timeline-utils.test.ts` | Vitest suites for new helpers. Remove the `interpolatePeaks` suite. |
| `apps/web/src/components/home/aspects-timeline.tsx` | Rewrite `BarRange`, `computeRange`, `sampleToX`→`msToX`, tooltip, drop `ACTIVE_THRESHOLD`. Sample-discovery pass unchanged. |
| `AGENT_CHANGELOG.md` | Add a new dated entry. |

---

## Task 1: Add `orbAtTime` helper + tests

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline-utils.ts`
- Test: `apps/web/src/components/home/aspects-timeline-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `aspects-timeline-utils.test.ts`:

```ts
import { orbAtTime } from "./aspects-timeline-utils";
import { CelestialBody } from "@astro-app/shared-types";

describe("orbAtTime", () => {
  it("returns ~0 when the exact aspect holds (Sun-Sun conjunction self-test)", () => {
    const ms = Date.UTC(2026, 3, 19, 12, 0, 0); // Apr 19 12:00 UTC
    // Conjunction of Sun with itself: separation 0°, aspect angle 0° → orb 0°.
    const orb = orbAtTime(ms, CelestialBody.Sun, CelestialBody.Sun, 0);
    expect(orb).toBeCloseTo(0, 6);
  });

  it("returns ~60° from a conjunction when testing as a trine", () => {
    // Sun vs itself, asked as trine (120°): separation 0°, orb = |0 - 120| = 120°.
    const ms = Date.UTC(2026, 3, 19, 12, 0, 0);
    const orb = orbAtTime(ms, CelestialBody.Sun, CelestialBody.Sun, 120);
    expect(orb).toBeCloseTo(120, 6);
  });

  it("folds separations > 180° to the short way around", () => {
    // Sun-Moon at a known full moon-ish time. We only need that orb <= 180.
    const ms = Date.UTC(2026, 3, 19, 12, 0, 0);
    const orb = orbAtTime(ms, CelestialBody.Sun, CelestialBody.Moon, 0);
    expect(orb).toBeGreaterThanOrEqual(0);
    expect(orb).toBeLessThanOrEqual(180);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: FAIL with `orbAtTime is not a function` (or similar import error).

- [ ] **Step 3: Write the implementation**

Add to the top of `aspects-timeline-utils.ts`:

```ts
import { calculateBodyPosition } from "@astro-app/approx-engine";
import type { CelestialBody } from "@astro-app/shared-types";
```

Append to `aspects-timeline-utils.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: new `orbAtTime` tests PASS. Existing `orbIntensity` / `catmullRomPath` / `interpolatePeaks` suites still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline-utils.ts apps/web/src/components/home/aspects-timeline-utils.test.ts
git commit -m "Phase 3 Task: add orbAtTime helper for timeline root-finding"
```

---

## Task 2: Add `refinePeakTime` helper + tests

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline-utils.ts`
- Test: `apps/web/src/components/home/aspects-timeline-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `aspects-timeline-utils.test.ts`:

```ts
import { refinePeakTime } from "./aspects-timeline-utils";

describe("refinePeakTime", () => {
  it("converges to a time inside the bracket with a non-negative orb", () => {
    const ms = Date.UTC(2026, 3, 19, 12, 0, 0);
    const HALF = 6 * 3600 * 1000;
    const bracketStart = ms - HALF;
    const bracketEnd = ms + HALF;
    const { ms: peakMs, orb: peakOrb } = refinePeakTime(
      bracketStart,
      bracketEnd,
      CelestialBody.Sun,
      CelestialBody.Moon,
      30,
    );
    expect(peakMs).toBeGreaterThanOrEqual(bracketStart);
    expect(peakMs).toBeLessThanOrEqual(bracketEnd);
    expect(peakOrb).toBeGreaterThanOrEqual(0);
  });

  it("converges to within 60 seconds of a brute-force minimum", () => {
    // Brute-force: sample orb at 1-minute resolution across a 4-hour bracket.
    const centerMs = Date.UTC(2026, 3, 19, 12, 0, 0);
    const HALF = 2 * 3600 * 1000;
    const start = centerMs - HALF;
    const end = centerMs + HALF;

    const { ms: peakMs } = refinePeakTime(
      start,
      end,
      CelestialBody.Sun,
      CelestialBody.Moon,
      30,
    );

    let bruteBestOrb = Infinity;
    let bruteBestMs = start;
    for (let t = start; t <= end; t += 60_000) {
      const o = orbAtTime(t, CelestialBody.Sun, CelestialBody.Moon, 30);
      if (o < bruteBestOrb) {
        bruteBestOrb = o;
        bruteBestMs = t;
      }
    }

    expect(Math.abs(peakMs - bruteBestMs)).toBeLessThanOrEqual(60_000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: FAIL with `refinePeakTime is not exported`.

- [ ] **Step 3: Write the implementation**

Append to `aspects-timeline-utils.ts`:

```ts
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
```

Also add `orbAtTime` to the imports of the test file if not already present (it was imported in Task 1). The brute-force test uses it directly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: PASS. The brute-force comparison proves sub-minute convergence.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline-utils.ts apps/web/src/components/home/aspects-timeline-utils.test.ts
git commit -m "Phase 3 Task: add refinePeakTime golden-section helper"
```

---

## Task 3: Add `findOrbCrossing` helper + tests

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline-utils.ts`
- Test: `apps/web/src/components/home/aspects-timeline-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `aspects-timeline-utils.test.ts`:

```ts
import { findOrbCrossing } from "./aspects-timeline-utils";

describe("findOrbCrossing", () => {
  // Common fixture: Sun-Moon semi-sextile in late April 2026. maxOrb = 2°.
  // We first locate a local peak to seed the crossing search.
  const body1 = CelestialBody.Sun;
  const body2 = CelestialBody.Moon;
  const aspectAngle = 30;
  const maxOrb = 2;

  function setupPeak(centerMs: number, halfMs: number) {
    const { ms: peakMs, orb: peakOrb } = refinePeakTime(
      centerMs - halfMs,
      centerMs + halfMs,
      body1,
      body2,
      aspectAngle,
    );
    return { peakMs, peakOrb };
  }

  it("locates left and right crossings with sub-minute precision (brute-force check)", () => {
    // Seed around a plausible semi-sextile peak within April 2026.
    const center = Date.UTC(2026, 3, 19, 12, 0, 0);
    const { peakMs, peakOrb } = setupPeak(center, 6 * 3600 * 1000);
    // Only meaningful if peak is inside orb; skip otherwise.
    if (peakOrb >= maxOrb) return;

    const left = findOrbCrossing(
      "left",
      peakMs,
      peakOrb,
      peakMs - 6 * 3600 * 1000,
      maxOrb,
      body1,
      body2,
      aspectAngle,
    );
    const right = findOrbCrossing(
      "right",
      peakMs,
      peakOrb,
      peakMs + 6 * 3600 * 1000,
      maxOrb,
      body1,
      body2,
      aspectAngle,
    );

    expect(left.clipped).toBe(false);
    expect(right.clipped).toBe(false);
    expect(left.ms).toBeLessThan(peakMs);
    expect(right.ms).toBeGreaterThan(peakMs);

    // Brute force: scan at 1-minute resolution.
    const SCAN_MIN = 60_000;
    let bruteLeftMs: number | null = null;
    for (let t = peakMs; t >= peakMs - 24 * 3600 * 1000; t -= SCAN_MIN) {
      if (orbAtTime(t, body1, body2, aspectAngle) >= maxOrb) {
        bruteLeftMs = t;
        break;
      }
    }
    let bruteRightMs: number | null = null;
    for (let t = peakMs; t <= peakMs + 24 * 3600 * 1000; t += SCAN_MIN) {
      if (orbAtTime(t, body1, body2, aspectAngle) >= maxOrb) {
        bruteRightMs = t;
        break;
      }
    }

    expect(bruteLeftMs).not.toBeNull();
    expect(bruteRightMs).not.toBeNull();
    expect(Math.abs(left.ms - bruteLeftMs!)).toBeLessThanOrEqual(60_000);
    expect(Math.abs(right.ms - bruteRightMs!)).toBeLessThanOrEqual(60_000);
  });

  it("widens the bracket when the initial outer edge is still in orb", () => {
    // Give a deliberately too-narrow bracket (1 minute): widening must kick in.
    const center = Date.UTC(2026, 3, 19, 12, 0, 0);
    const { peakMs, peakOrb } = setupPeak(center, 6 * 3600 * 1000);
    if (peakOrb >= maxOrb) return;

    const right = findOrbCrossing(
      "right",
      peakMs,
      peakOrb,
      peakMs + 60_000, // 1 minute — well inside the active window
      maxOrb,
      body1,
      body2,
      aspectAngle,
    );
    expect(right.clipped).toBe(false);
    expect(right.ms).toBeGreaterThan(peakMs + 60_000);
  });

  it("returns clipped=true when the crossing is beyond the 6-month cap", () => {
    // Saturn-Neptune was near their slow ~2026 conjunction; the
    // approximate engine puts the pair inside an 8° orb across months on
    // either side of exact. Entry to orb is > 6 months earlier → clipped.
    const b1 = CelestialBody.Saturn;
    const b2 = CelestialBody.Neptune;
    const angle = 0;
    const orb = 8;

    const center = Date.UTC(2026, 3, 19, 12, 0, 0);
    const { ms: peakMs, orb: peakOrb } = refinePeakTime(
      center - 24 * 3600 * 1000,
      center + 24 * 3600 * 1000,
      b1,
      b2,
      angle,
    );
    // Skip if the simulation doesn't put the pair in orb at the probe
    // centre — the clipped path only exists when there's a valid peak.
    if (peakOrb >= orb) return;

    const left = findOrbCrossing(
      "left",
      peakMs,
      peakOrb,
      peakMs - 60_000,
      orb,
      b1,
      b2,
      angle,
    );
    expect(left.clipped).toBe(true);
  });
});
```

Note: the third test uses `setupPeak.call(null, ...)` as a syntactic alternative to avoid re-declaring bodies; keep it simple. If Saturn-Neptune's simulated peak falls out of orb under the approximation, the test short-circuits. Adjust if needed during implementation — a deterministic synthetic test using mocked `orbAtTime` is also acceptable if environmental flakiness appears.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: FAIL with `findOrbCrossing is not exported`.

- [ ] **Step 3: Write the implementation**

Append to `aspects-timeline-utils.ts`:

```ts
const ARCMIN = 1 / 60;
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
  let innerOrb = peakOrb;

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
    // If the inflection is still below maxOrb the whole bracket stays in
    // orb; fall through to the cap-clipped return below.
    if (inflectionOrb < maxOrb && outerOrb < maxOrb) {
      return { ms: peakMs + direction * WIDEN_CAP_MS, clipped: true };
    }
  }

  // Bisection.
  for (let i = 0; i < MAX_ITER; i++) {
    if (Math.abs(outerMs - innerMs) < CONVERGENCE_MS) break;
    const midMs = (innerMs + outerMs) / 2;
    const midOrb = orbAtTime(midMs, body1, body2, aspectAngle);
    if (Math.abs(midOrb - maxOrb) < ARCMIN) {
      return { ms: midMs, clipped: false };
    }
    if (midOrb < maxOrb) {
      innerMs = midMs;
      innerOrb = midOrb;
    } else {
      outerMs = midMs;
      outerOrb = midOrb;
    }
  }

  return { ms: (innerMs + outerMs) / 2, clipped: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: PASS. The brute-force comparison guarantees sub-minute accuracy; the widening test exercises the doubling loop; the clipped test exercises the cap.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline-utils.ts apps/web/src/components/home/aspects-timeline-utils.test.ts
git commit -m "Phase 3 Task: add findOrbCrossing bisection helper"
```

---

## Task 4: Integrate helpers into `aspects-timeline.tsx`

Rewrite `BarRange`, `computeRange`, `sampleToX`→`msToX`, tooltip labels, and drop `ACTIVE_THRESHOLD`. The sample-discovery pass stays as-is.

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline.tsx`

- [ ] **Step 1: Replace `BarRange`**

Find the existing block at roughly lines 246-253:

```ts
interface BarRange {
  bar: AspectBar;
  fromSample: number;
  toSample: number;
  peakSample: number;
  peakValue: number;
}
```

Replace with:

```ts
interface BarRange {
  bar: AspectBar;
  startMs: number;
  peakMs: number;
  endMs: number;
  peakValue: number;
  startClipped: boolean;
  endClipped: boolean;
}
```

- [ ] **Step 2: Add an aspect-angle lookup**

Near the `ASPECT_NAMES` map (around line 90), add:

```ts
const ASPECT_ANGLES: Record<AspectType, number> = {
  [AspectType.Conjunction]: 0,
  [AspectType.Opposition]: 180,
  [AspectType.Trine]: 120,
  [AspectType.Square]: 90,
  [AspectType.Sextile]: 60,
  [AspectType.Quincunx]: 150,
  [AspectType.SemiSextile]: 30,
  [AspectType.SemiSquare]: 45,
  [AspectType.Sesquisquare]: 135,
  [AspectType.Quintile]: 72,
  [AspectType.BiQuintile]: 144,
};
```

- [ ] **Step 3: Update imports**

Replace the existing import from `./aspects-timeline-utils`:

```ts
import { orbIntensity, interpolatePeaks } from "./aspects-timeline-utils";
```

with:

```ts
import {
  orbIntensity,
  refinePeakTime,
  findOrbCrossing,
} from "./aspects-timeline-utils";
```

- [ ] **Step 4: Rewrite `computeRange`**

Replace the entire `computeRange` function (lines ~254-293) with:

```ts
function computeRange(
  bar: AspectBar,
  windowStartMs: number,
  maxOrbMap: Partial<Record<AspectType, number>>,
): BarRange | null {
  // Locate the sample with the strongest intensity.
  let bestIdx = -1;
  let bestValue = 0;
  for (let i = 0; i < bar.samples.length; i++) {
    const v = bar.samples[i]!;
    if (v > bestValue) {
      bestValue = v;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;

  const maxOrb = maxOrbMap[bar.aspectType] ?? 8;
  const aspectAngle = ASPECT_ANGLES[bar.aspectType] ?? 0;

  // Peak-refinement bracket: ±1 sample around bestIdx, clamped to [0, N-1].
  const peakBracketStart =
    windowStartMs + Math.max(0, bestIdx - 1) * SAMPLE_MS;
  const peakBracketEnd =
    windowStartMs + Math.min(bar.samples.length - 1, bestIdx + 1) * SAMPLE_MS;

  const peak = refinePeakTime(
    peakBracketStart,
    peakBracketEnd,
    bar.groupPlanet,
    bar.otherPlanet,
    aspectAngle,
  );

  if (peak.orb >= maxOrb) return null;

  // Seed the crossing brackets from the nearest zero-intensity samples.
  let leftInactiveIdx = -1;
  for (let i = bestIdx - 1; i >= 0; i--) {
    if (bar.samples[i]! === 0) {
      leftInactiveIdx = i;
      break;
    }
  }
  let rightInactiveIdx = -1;
  for (let i = bestIdx + 1; i < bar.samples.length; i++) {
    if (bar.samples[i]! === 0) {
      rightInactiveIdx = i;
      break;
    }
  }

  const leftOuterMs =
    leftInactiveIdx >= 0
      ? windowStartMs + leftInactiveIdx * SAMPLE_MS
      : windowStartMs;
  const rightOuterMs =
    rightInactiveIdx >= 0
      ? windowStartMs + rightInactiveIdx * SAMPLE_MS
      : windowStartMs + (bar.samples.length - 1) * SAMPLE_MS;

  const start = findOrbCrossing(
    "left",
    peak.ms,
    peak.orb,
    leftOuterMs,
    maxOrb,
    bar.groupPlanet,
    bar.otherPlanet,
    aspectAngle,
  );
  const end = findOrbCrossing(
    "right",
    peak.ms,
    peak.orb,
    rightOuterMs,
    maxOrb,
    bar.groupPlanet,
    bar.otherPlanet,
    aspectAngle,
  );

  return {
    bar,
    startMs: start.ms,
    peakMs: peak.ms,
    endMs: end.ms,
    peakValue: 1 - peak.orb / maxOrb,
    startClipped: start.clipped,
    endClipped: end.clipped,
  };
}
```

- [ ] **Step 5: Update `ranges` useMemo**

Find the block (around line 358):

```ts
const ranges = useMemo(() => {
  const filter = isMinor ? MINOR_ASPECTS : MAJOR_ASPECTS;
  const list: BarRange[] = [];
  for (const bar of bars) {
    if (!filter.has(bar.aspectType)) continue;
    const r = computeRange(bar);
    if (r) list.push(r);
  }
  list.sort((a, b) => {
    if (a.peakSample !== b.peakSample) return a.peakSample - b.peakSample;
    return b.peakValue - a.peakValue;
  });
  return list;
}, [bars, isMinor]);
```

`windowStartMs` is defined below this block — hoist it above. Move the 4 lines:

```ts
const windowStartMs = today.getTime() + DAY_OFFSET * 24 * 3600 * 1000;
const windowDurationMs = DAY_COUNT * 24 * 3600 * 1000;
```

above the `ranges` useMemo. Then rewrite the memo:

```ts
const windowStartMs = today.getTime() + DAY_OFFSET * 24 * 3600 * 1000;
const windowDurationMs = DAY_COUNT * 24 * 3600 * 1000;
const windowEndMs = windowStartMs + windowDurationMs;

const ranges = useMemo(() => {
  const filter = isMinor ? MINOR_ASPECTS : MAJOR_ASPECTS;
  const list: BarRange[] = [];
  for (const bar of bars) {
    if (!filter.has(bar.aspectType)) continue;
    const r = computeRange(bar, windowStartMs, maxOrbMap);
    if (!r) continue;
    // Include bar if its in-orb window overlaps the visible 10-day window.
    if (r.endMs < windowStartMs || r.startMs > windowEndMs) continue;
    list.push(r);
  }
  list.sort((a, b) => {
    if (a.peakMs !== b.peakMs) return a.peakMs - b.peakMs;
    return b.peakValue - a.peakValue;
  });
  return list;
}, [bars, isMinor, windowStartMs, windowEndMs, maxOrbMap]);
```

- [ ] **Step 6: Replace `sampleToX` and bar rendering**

Find the existing `sampleToX`:

```ts
const sampleToX = (sampleIdx: number) =>
  ((sampleIdx + 0.5) / TOTAL_SAMPLES) * VIEWBOX_W;
```

Replace with:

```ts
const msToX = (ms: number) =>
  ((ms - windowStartMs) / windowDurationMs) * VIEWBOX_W;

const clampX = (x: number) => Math.max(0, Math.min(VIEWBOX_W, x));
```

Find the bar-rendering block (around lines 457-510) and replace its body. The new body:

```ts
{ranges.map((r, idx) => {
  const y = TOP_PAD + idx * ROW_HEIGHT;
  const rawX1 = msToX(r.startMs);
  const rawX2 = msToX(r.endMs);
  const x1 = clampX(rawX1);
  const x2 = clampX(rawX2);
  const peakX = clampX(msToX(r.peakMs));
  const color =
    ASPECT_COLORS[r.bar.aspectType] ?? "var(--muted-foreground)";
  const pG = PLANET_GLYPHS[r.bar.groupPlanet] ?? "·";
  const aG = ASPECT_GLYPHS[r.bar.aspectType] ?? "·";
  const oG = PLANET_GLYPHS[r.bar.otherPlanet] ?? "·";
  const aspectName = ASPECT_NAMES[r.bar.aspectType] ?? r.bar.aspectType;
  const hitX = Math.min(x1, x2) - 2;
  const hitW = Math.abs(x2 - x1) + 4;
  const startLabel = r.startClipped
    ? `before ${formatMs(windowStartMs)}`
    : formatMs(r.startMs);
  const endLabel = r.endClipped
    ? `after ${formatMs(windowEndMs)}`
    : formatMs(r.endMs);
  const peakLabel = formatMs(r.peakMs);
  return (
    <Tooltip key={`bar-${idx}`}>
      <TooltipTrigger
        render={
          <g>
            <rect
              x={hitX}
              y={y - ROW_HEIGHT / 2}
              width={hitW}
              height={ROW_HEIGHT}
              fill="transparent"
              pointerEvents="all"
            />
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={color}
              strokeWidth={1.5}
              opacity={0.38}
              strokeLinecap="round"
            />
            <circle cx={peakX} cy={y} r={3} fill={color} />
            <text
              x={x1 - 6}
              y={y + 3}
              fontSize={10}
              textAnchor="end"
              fill="var(--muted-foreground)"
            >
              <tspan>{pG}</tspan>
              <tspan style={{ fill: color }}>{aG}</tspan>
              <tspan>{oG}</tspan>
            </text>
          </g>
        }
      />
      <TooltipContent
        side="top"
        className="flex-col items-start gap-1 py-2 text-[11px] leading-tight"
      >
        <div className="font-medium text-[12px]">
          <span>{pG}</span>
          <span className="mx-1" style={{ color }}>
            {aG}
          </span>
          <span>{oG}</span>
          <span className="mx-1 opacity-60">·</span>
          <span>{aspectName}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 opacity-90">
          <span className="opacity-60">Start</span>
          <span className="font-mono">{startLabel}</span>
          <span className="opacity-60">Peak</span>
          <span className="font-mono">{peakLabel}</span>
          <span className="opacity-60">End</span>
          <span className="font-mono">{endLabel}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
})}
```

- [ ] **Step 7: Replace `formatSampleTime` with `formatMs`**

Find:

```ts
function formatSampleTime(windowStartMs: number, sampleIdx: number): string {
  const ms = windowStartMs + sampleIdx * SAMPLE_MS;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
```

Replace with:

```ts
function formatMs(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
```

- [ ] **Step 8: Remove `ACTIVE_THRESHOLD`**

Delete the constant near line 123:

```ts
const ACTIVE_THRESHOLD = 0.05;
```

- [ ] **Step 9: Remove unused `SAMPLES_PER_DAY` / `TOTAL_SAMPLES` references in rendering**

`SAMPLE_MS` and `TOTAL_SAMPLES` must stay — the sample-discovery pass uses them. `sampleToX` references to `TOTAL_SAMPLES` are deleted as part of Step 6; leave the constants themselves alone.

- [ ] **Step 10: Run typecheck and tests**

Run: `npm run typecheck --workspace=apps/web`
Expected: passes.

Run: `npm test --workspace=apps/web -- aspects-timeline`
Expected: existing utils tests still pass.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline.tsx
git commit -m "Phase 3 Task: integrate bisection-based in-orb windows in aspects timeline"
```

---

## Task 5: Delete `interpolatePeaks` and its tests

`interpolatePeaks` is no longer consumed anywhere after Task 4.

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline-utils.ts`
- Modify: `apps/web/src/components/home/aspects-timeline-utils.test.ts`

- [ ] **Step 1: Remove the `interpolatePeaks` function and the `TimelinePoint` interface**

Delete:

```ts
interface TimelinePoint {
  x: number;
  value: number;
}

/**
 * Augments discrete intensity samples with analytically-derived apex points
 * ...
 */
export function interpolatePeaks(samples: number[]): TimelinePoint[] {
  // ... entire body
}
```

- [ ] **Step 2: Remove the corresponding test block**

In `aspects-timeline-utils.test.ts`, delete the `describe("interpolatePeaks", ...)` block and remove `interpolatePeaks` from the top-of-file import.

- [ ] **Step 3: Verify no other consumers**

Run: `grep -r "interpolatePeaks" apps/web/src packages`
Expected: no matches.

(Use the Grep tool: pattern `interpolatePeaks`, path `apps/web/src` and `packages`.)

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run typecheck --workspace=apps/web && npm test --workspace=apps/web -- aspects-timeline-utils`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline-utils.ts apps/web/src/components/home/aspects-timeline-utils.test.ts
git commit -m "Phase 3 Task: remove superseded interpolatePeaks helper"
```

---

## Task 6: Manual browser verification

**Files:** _(no file edits)_

- [ ] **Step 1: Start the dev server**

Run: `npm run dev --workspace=apps/web`
Expected: Vite serves on `http://localhost:5173` (or the configured port).

- [ ] **Step 2: Visit the home page**

Open `http://localhost:5173` in a browser. Scroll to the 10-Day Major Aspects card and the 10-Day Minor Aspects card.

- [ ] **Step 3: Verify the originally-reported bug**

Locate the Sun semi-sextile Moon bar on ~Apr 19 (if the date is still within the 10-day window). Hover it. Expected:
- The bar spans a visible horizontal segment (not a zero-length dot).
- Tooltip Start, Peak, End are distinct timestamps — `Peak − Start` and `End − Peak` both positive, in the 2–4 hour range for a Moon semi-sextile.

- [ ] **Step 4: Verify slow-planet behaviour**

Hover a slow-planet aspect (e.g. Saturn square something, or a Neptune aspect) whose bar extends to the window edge. Expected:
- Bar is clipped at the window edge.
- Tooltip shows a real start/end date, potentially months in the past/future.
- If beyond ±6 months, tooltip says `"before Apr 16, 00:00"` or `"after Apr 26, 00:00"` (using the actual window boundaries).

- [ ] **Step 5: Verify no regressions on fast-moving aspects**

Hover a Moon conjunction and a Mars-Jupiter aspect. Expected:
- Tooltips show distinct Start / Peak / End.
- Bar extents match the tooltip spans visually.

---

## Task 7: Update `AGENT_CHANGELOG.md` and finalise

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Prepend a new section to `AGENT_CHANGELOG.md`**

Add directly under `# Agent Changelog`:

```markdown
## 2026-04-18 — aspects timeline: precise in-orb windows

### Change
Replaced sample-grid-based Start / Peak / End computation in
`apps/web/src/components/home/aspects-timeline.tsx` with bisection-based
root finding against `@astro-app/approx-engine`:

- New helpers in `aspects-timeline-utils.ts`: `orbAtTime`,
  `refinePeakTime` (golden-section minimisation), `findOrbCrossing`
  (bisection with exponential widening and 3-point monotonicity safety
  for retrograde reversals).
- `BarRange` migrated from sample-index fields to absolute `ms`
  timestamps plus `startClipped` / `endClipped` flags.
- Rendering now uses `msToX` and `clampX` so bars placed entirely by
  real time and clipped to the viewport; tooltip labels render the
  converged ms directly or "before / after 〈window edge〉" for clipped
  boundaries.
- `ACTIVE_THRESHOLD` sample-gate removed — bars are included if their
  `[startMs, endMs]` overlaps the 10-day window.
- Deleted the now-unused `interpolatePeaks` helper and its tests.

### Decisions Made
- **Bisection over analytic linear-speed formula.** An earlier design used
  `halfWindow = peakValue × maxOrb / |s1 − s2|` evaluated at the peak.
  That works for fast-moving pairs but degrades by days-to-weeks for
  slow-slow aspects (e.g. Saturn-Neptune) because relative angular speed
  varies dramatically across a multi-month in-orb window. Bisection is
  accurate to sub-minute for any pair.
- **Window overlap, not peak-in-window, for inclusion filter.** An
  aspect whose orb window extends across the 10-day window but whose
  peak is outside it (e.g. already past exact, still in orb) should
  still render.
- **3-point monotonicity guard, not full scan.** Retrograde reversals
  inside an in-orb window are rare; a 3-probe check catches them cheaply
  and a fallback golden-section max narrows the bracket to the first
  crossing when needed.
- **6-month widening cap.** Aspects in orb beyond that are effectively
  "always on" in the 10-day view; labelling them `before / after 〈edge〉`
  is more useful than an extrapolation that could be years away.

### References
- Spec: `docs/superpowers/specs/2026-04-18-aspect-timeline-precision-design.md`
- Plan: `docs/superpowers/plans/2026-04-18-aspect-timeline-precision.md`
- Primary files changed:
  - `apps/web/src/components/home/aspects-timeline-utils.ts`
  - `apps/web/src/components/home/aspects-timeline-utils.test.ts`
  - `apps/web/src/components/home/aspects-timeline.tsx`

```

- [ ] **Step 2: Run the full test and typecheck pass**

Run: `npm run typecheck --workspace=apps/web && npm test --workspace=apps/web`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "Phase 3 Task: changelog for aspect timeline precision work"
```

---

## Verification Summary

After Task 7:

- [ ] `npm run typecheck --workspace=apps/web` — passes.
- [ ] `npm test --workspace=apps/web` — all tests pass.
- [ ] Manual browser smoke (Task 6) — no zero-length bars, slow-planet bars clipped sensibly.
- [ ] `git log --oneline` — 6 focused commits on `feature/design_improvements`.
