import { describe, it, expect } from "vitest";
import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { CelestialBody } from "@astro-app/shared-types";
import { calculateBodyPosition } from "./index.js";

const TEST_DATES = [
  new Date("1975-06-15T12:00:00Z"),
  new Date("2000-01-01T12:00:00Z"),
  new Date("2026-04-18T12:00:00Z"),
  new Date("2050-09-23T12:00:00Z"),
  new Date("2075-12-22T12:00:00Z"),
];

const TOLERANCE: Partial<Record<CelestialBody, number>> = {
  [CelestialBody.Sun]:     0.10, // 6 arcmin — matches existing vsop87.test.ts
  [CelestialBody.Moon]:    0.50, // ELP2000 truncated, drift over decades
  [CelestialBody.Mercury]: 0.50,
  [CelestialBody.Venus]:   0.30,
  [CelestialBody.Mars]:    0.30,
  [CelestialBody.Jupiter]: 0.15,
  [CelestialBody.Saturn]:  0.15,
  [CelestialBody.Uranus]:  0.30,
  [CelestialBody.Neptune]: 0.30,
  [CelestialBody.Pluto]:   1.00, // Pluto orbit is highly approximated
};

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
        const ref = Ecliptic(GeoVector(refBody, date, true)).elon;
        const diff = angularDiff(ours.longitude, ref);
        const tol = TOLERANCE[ourBody] ?? 1.0;
        expect(diff, `our: ${ours.longitude.toFixed(4)}°, ref: ${ref.toFixed(4)}°, diff: ${diff.toFixed(4)}°`).toBeLessThanOrEqual(tol);
      });
    }
  }
});
