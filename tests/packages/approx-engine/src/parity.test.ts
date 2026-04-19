import { describe, it, expect } from "vitest";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { CelestialBody } from "@astro-app/shared-types";
import { calculateBodyPosition } from "../../../../packages/approx-engine/src/index.js";

// Dates span ±75 years around J2000 so the tests exercise both near-epoch
// accuracy (2000, 2026) and the far-drift regime (1975, 2075). Do not prune.
const TEST_DATES = [
  new Date("1975-06-15T12:00:00Z"),
  new Date("2000-01-01T12:00:00Z"),
  new Date("2026-04-18T12:00:00Z"),
  new Date("2050-09-23T12:00:00Z"),
  new Date("2075-12-22T12:00:00Z"),
];

// Backed by astronomy-engine; parity check is effectively a regression guard
// against accidental breakage. 0.001° tolerance absorbs floating-point
// rounding. calculateBodyPosition now IS astronomy-engine internally, so
// agreement should be essentially zero (up to floating-point noise).
const TOLERANCE: Partial<Record<CelestialBody, number>> = {
  [CelestialBody.Sun]:     0.001,
  [CelestialBody.Moon]:    0.001,
  [CelestialBody.Mercury]: 0.001,
  [CelestialBody.Venus]:   0.001,
  [CelestialBody.Mars]:    0.001,
  [CelestialBody.Jupiter]: 0.001,
  [CelestialBody.Saturn]:  0.001,
  [CelestialBody.Uranus]:  0.001,
  [CelestialBody.Neptune]: 0.001,
  [CelestialBody.Pluto]:   0.001,
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
        // `true` = include annual aberration — same flag used in bodies.ts,
        // so the comparison is apples-to-apples.
        const ref = Ecliptic(GeoVector(refBody, date, true)).elon;
        const diff = angularDiff(ours.longitude, ref);
        const tol = TOLERANCE[ourBody] ?? 1.0;
        expect(diff, `our: ${ours.longitude.toFixed(4)}°, ref: ${ref.toFixed(4)}°, diff: ${diff.toFixed(4)}°`).toBeLessThanOrEqual(tol);
      });
    }
  }
});
