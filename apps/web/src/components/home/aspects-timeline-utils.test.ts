import { describe, it, expect } from "vitest";
import { orbIntensity, catmullRomPath } from "./aspects-timeline-utils";

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
