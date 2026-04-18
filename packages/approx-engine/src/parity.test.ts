import { describe, it, expect } from "vitest";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { CelestialBody } from "@astro-app/shared-types";
import { calculateBodyPosition } from "./index.js";

// Dates span ±75 years around J2000 so the tests exercise both near-epoch
// accuracy (2000, 2026) and the far-drift regime (1975, 2075). Do not prune.
const TEST_DATES = [
  new Date("1975-06-15T12:00:00Z"),
  new Date("2000-01-01T12:00:00Z"),
  new Date("2026-04-18T12:00:00Z"),
  new Date("2050-09-23T12:00:00Z"),
  new Date("2075-12-22T12:00:00Z"),
];

// Tolerances reflect the actual accuracy of the truncated Keplerian model
// (no planetary perturbations). Near J2000 errors are ~0.3°; at ±75 years
// secular drift accumulates to ~1°–1.15°. Set to ~2× observed max.
// See vsop87.ts header for per-body accuracy notes.
//
// To recalibrate after an engine improvement: temporarily set each tolerance
// to Infinity, log `diff` in the assertion, record the max per body across
// all TEST_DATES, and set the new tolerance to ~1.5–2× that max.
const TOLERANCE: Partial<Record<CelestialBody, number>> = {
  [CelestialBody.Sun]:     1.20, // observed max ~1.05° at 2075
  [CelestialBody.Moon]:    0.50, // ELP2000 truncated, drift over decades
  [CelestialBody.Mercury]: 1.20, // observed max ~1.06° at 2075
  [CelestialBody.Venus]:   1.20, // observed max ~1.05° at 2075
  [CelestialBody.Mars]:    1.20, // observed max ~1.06° at 2075
  [CelestialBody.Jupiter]: 1.20, // observed max ~1.00° at 2075
  [CelestialBody.Saturn]:  1.30, // observed max ~1.15° at 2075
  [CelestialBody.Uranus]:  1.20, // observed max ~1.07° at 2075
  [CelestialBody.Neptune]: 1.20, // observed max ~1.07° at 2075
  [CelestialBody.Pluto]:   1.20, // observed max ~1.05° at 2075
};

// Chiron and the lunar nodes (MeanNorthNode / MeanSouthNode) are intentionally
// omitted: astronomy-engine has no direct equivalent for them.
const BODY_MAP: Partial<Record<CelestialBody, Body>> = {
  [CelestialBody.Sun]:     Body.Sun,
  [CelestialBody.Moon]:    Body.Moon,
  [CelestialBody.Mercury]: Body.Mercury,
  [CelestialBody.Venus]:   Body.Venus,
  [CelestialBody.Mars]:    Body.Mars,
  [CelestialBody.Jupiter]: Body.Jupiter,
  [CelestialBody.Saturn]:  Body.Saturn,
  [CelestialBody.Uranus]:  Body.Uranus,
  [CelestialBody.Neptune]: Body.Neptune,
  [CelestialBody.Pluto]:   Body.Pluto,
};

function angularDiff(a: number, b: number): number {
  // signed diff folded onto [-180, 180]
  const d = ((a - b) + 540) % 360 - 180;
  return Math.abs(d);
}

describe("parity: calculateBodyPosition vs astronomy-engine", () => {
  for (const [ourBody, refBody] of Object.entries(BODY_MAP) as [CelestialBody, Body][]) {
    for (const date of TEST_DATES) {
      const label = `${ourBody} at ${date.toISOString().slice(0, 10)}`;
      it(label, () => {
        const ours = calculateBodyPosition(date, ourBody);
        // `true` = include annual aberration (~0.006° bias vs. our
        // true-geocentric output). Negligible against current tolerances
        // (~1°); flip to `false` if tolerances ever reach that regime.
        const ref = Ecliptic(GeoVector(refBody, date, true)).elon;
        const diff = angularDiff(ours.longitude, ref);
        const tol = TOLERANCE[ourBody] ?? 1.0;
        expect(diff, `our: ${ours.longitude.toFixed(4)}°, ref: ${ref.toFixed(4)}°, diff: ${diff.toFixed(4)}°`).toBeLessThanOrEqual(tol);
      });
    }
  }
});
