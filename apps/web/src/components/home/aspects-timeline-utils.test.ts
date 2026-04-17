import { describe, it, expect } from "vitest";
import { orbIntensity, catmullRomPath, interpolatePeaks } from "./aspects-timeline-utils";

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

describe("catmullRomPath", () => {
  it("returns empty string for empty input", () => {
    expect(catmullRomPath([])).toBe("");
  });

  it("returns a move command for a single point", () => {
    expect(catmullRomPath([[10, 20]])).toBe("M 10,20");
  });

  it("starts with M for the first point", () => {
    const path = catmullRomPath([[0, 50], [100, 50]]);
    expect(path).toMatch(/^M 0,50/);
  });

  it("produces a C command for each segment after the first point", () => {
    const path = catmullRomPath([[0, 50], [50, 0], [100, 50]]);
    const segments = path.match(/C /g);
    expect(segments).toHaveLength(2);
  });

  it("ends at the last point coordinates", () => {
    const path = catmullRomPath([[0, 100], [50, 0], [100, 100]]);
    expect(path).toContain("100.00,100.00");
  });
});

describe("interpolatePeaks", () => {
  it("returns original samples as points when no peak qualifies", () => {
    const pts = interpolatePeaks([0, 0, 0, 0]);
    expect(pts).toEqual([
      { x: 0, value: 0 },
      { x: 1, value: 0 },
      { x: 2, value: 0 },
      { x: 3, value: 0 },
    ]);
  });

  it("inserts an apex for a clean asymmetric peak (falling-limb case)", () => {
    // physics-consistent: apex at tp=2.833, slope 0.8125
    const pts = interpolatePeaks([0, 0, 0.323, 0.864, 0.052, 0, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeCloseTo(2.833, 2);
  });

  it("inserts an apex for a peak on the rising-limb side", () => {
    // mirror of above: apex between i and i+1
    const pts = interpolatePeaks([0, 0.052, 0.864, 0.323, 0, 0, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeCloseTo(2.167, 2);
  });

  it("keeps apex x strictly inside (i-1, i+1)", () => {
    const pts = interpolatePeaks([0, 0.2, 0.9, 0.3, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeGreaterThan(1);
    expect(apex!.x).toBeLessThan(3);
  });

  it("skips peaks whose value is below the threshold", () => {
    const pts = interpolatePeaks([0, 0.1, 0.3, 0.1, 0]);
    expect(pts.every((p) => p.value < 1)).toBe(true);
  });

  it("skips peaks where a neighbour is zero (edge of active window)", () => {
    const pts = interpolatePeaks([0, 0, 0.9, 0.3, 0]);
    expect(pts.every((p) => p.value < 1)).toBe(true);
  });

  it("returns points sorted by x", () => {
    const pts = interpolatePeaks([0, 0.3, 0.9, 0.2, 0]);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i]!.x).toBeGreaterThanOrEqual(pts[i - 1]!.x);
    }
  });

  it("handles multiple peaks independently", () => {
    const pts = interpolatePeaks([
      0, 0.2, 0.9, 0.3, 0, 0, 0.3, 0.9, 0.2, 0,
    ]);
    const apexes = pts.filter((p) => p.value === 1);
    expect(apexes).toHaveLength(2);
  });

  it("inserts apex at plateau midpoint when two samples tie at the peak", () => {
    // tp lands exactly at sample midpoint → both straddling samples equal
    const pts = interpolatePeaks([0, 0, 0.595, 0.595, 0, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeCloseTo(2.5, 6);
  });

  it("handles a near-plateau where samples differ within tolerance", () => {
    const pts = interpolatePeaks([0, 0, 0.58, 0.61, 0, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeCloseTo(2.5, 6);
  });

  it("inserts plateau apex even when outer samples are clamped to zero", () => {
    // Fast Moon aspect — apex at sample midpoint, sides clipped
    const pts = interpolatePeaks([0, 0.595, 0.595, 0, 0]);
    const apex = pts.find((p) => p.value === 1);
    expect(apex).toBeDefined();
    expect(apex!.x).toBeCloseTo(1.5, 6);
  });
});
