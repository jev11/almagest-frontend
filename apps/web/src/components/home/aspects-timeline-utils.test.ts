import { describe, it, expect } from "vitest";
import { findOrbCrossing, orbAtTime, orbIntensity, refinePeakTime } from "./aspects-timeline-utils";
import { CelestialBody } from "@astro-app/shared-types";

describe("orbIntensity", () => {
  it("returns 1 when orb is 0 (exact aspect)", () => {
    expect(orbIntensity(0, 8)).toBe(1);
  });

  it("returns 0 when orb equals maxOrb", () => {
    expect(orbIntensity(8, 8)).toBe(0);
  });

  it("returns 0.5 at half the maxOrb", () => {
    expect(orbIntensity(4, 8)).toBe(0.5);
  });

  it("clamps to 0 when orb exceeds maxOrb", () => {
    expect(orbIntensity(10, 8)).toBe(0);
  });

  it("returns 0 when maxOrb is 0", () => {
    expect(orbIntensity(0, 0)).toBe(0);
  });

  it("clamps to 1 when orb is negative", () => {
    expect(orbIntensity(-1, 8)).toBe(1);
  });
});

describe("orbAtTime", () => {
  it("returns ~0 when the exact aspect holds (Sun-Sun conjunction self-test)", () => {
    const ms = Date.UTC(2026, 3, 19, 12, 0, 0); // Apr 19 12:00 UTC
    // Conjunction of Sun with itself: separation 0°, aspect angle 0° → orb 0°.
    const orb = orbAtTime(ms, CelestialBody.Sun, CelestialBody.Sun, 0);
    expect(orb).toBeCloseTo(0, 6);
  });

  it("returns ~120° when a conjunction is tested as a trine", () => {
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

describe("known-event regression", () => {
  // Each case: published exact-aspect UTC moment. We run refinePeakTime over
  // a ±12-hour bracket around the published moment and assert the recovered
  // peak agrees within our model's documented precision for Sun-Moon aspects.
  //
  // Tolerance: ±5 minutes. astronomy-engine is sub-arcsecond accurate, so
  // Sun-Moon aspect moments should recover within seconds of the published
  // value. 5 minutes is a conservative post-swap tolerance that catches any
  // systematic regression while giving headroom for differences between
  // reference sources (eclipse timing vs. USNO vs. astrology software).
  const TOLERANCE_MS = 5 * 60 * 1000;

  interface KnownEvent {
    name: string;
    utc: string;         // ISO UTC of the published exact moment
    aspectAngle: 0 | 180;
  }

  const EVENTS: KnownEvent[] = [
    { name: "2017-08-21 total solar eclipse (new moon)",     utc: "2017-08-21T18:30:00Z", aspectAngle: 0 },
    { name: "2022-05-16 total lunar eclipse (full moon)",    utc: "2022-05-16T04:14:00Z", aspectAngle: 180 },
    { name: "2023-10-14 annular solar eclipse (new moon)",   utc: "2023-10-14T17:55:00Z", aspectAngle: 0 },
    { name: "2024-04-08 total solar eclipse (new moon)",     utc: "2024-04-08T18:21:00Z", aspectAngle: 0 },
    { name: "2024-11-01 new moon",                           utc: "2024-11-01T12:47:00Z", aspectAngle: 0 },
  ];

  for (const event of EVENTS) {
    it(event.name, () => {
      const publishedMs = new Date(event.utc).getTime();
      const HALF = 12 * 3600 * 1000;
      const { ms: recoveredMs, orb } = refinePeakTime(
        publishedMs - HALF,
        publishedMs + HALF,
        CelestialBody.Sun,
        CelestialBody.Moon,
        event.aspectAngle,
      );
      const diffMs = Math.abs(recoveredMs - publishedMs);
      const diffMin = diffMs / 60000;
      expect(
        diffMin,
        `recovered ${new Date(recoveredMs).toISOString()} vs published ${event.utc}, Δ=${diffMin.toFixed(1)} min, orb=${orb.toFixed(3)}°`,
      ).toBeLessThanOrEqual(TOLERANCE_MS / 60000);
      // Sanity: at the recovered peak the orb should be small — within the
      // Sun-Moon parity tolerance (~0.5°). A huge orb would indicate the
      // bracket missed the aspect entirely.
      expect(orb).toBeLessThan(0.5);
    });
  }
});

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
