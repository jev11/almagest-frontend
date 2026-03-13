import { describe, it, expect } from "vitest";
import { resolveCollisions, type GlyphPosition } from "./layout.js";

function makePositions(angles: number[]): GlyphPosition[] {
  return angles.map((a, i) => ({
    body: `body${i}`,
    originalAngle: a,
    displayAngle: a,
    displaced: false,
  }));
}

describe("resolveCollisions", () => {
  it("does not modify well-spaced positions", () => {
    // 4 planets evenly spaced at 90° apart — well beyond minGlyphGap at any reasonable radius
    const positions = makePositions([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
    const result = resolveCollisions(positions, 200);
    for (const pos of result) {
      expect(pos.displaced).toBe(false);
    }
  });

  it("separates two overlapping glyphs", () => {
    // Two glyphs at almost same angle (radius=200, minGap=20px → minAngularGap≈0.1rad)
    const positions = makePositions([1.0, 1.01]);
    const result = resolveCollisions(positions, 200);
    const angleDiff = Math.abs(result[1]!.displayAngle - result[0]!.displayAngle);
    const pixelDist = angleDiff * 200;
    expect(pixelDist).toBeGreaterThan(15); // should have separated somewhat
  });

  it("marks displaced positions", () => {
    const positions = makePositions([1.0, 1.01]);
    const result = resolveCollisions(positions, 200);
    const anyDisplaced = result.some((p) => p.displaced);
    expect(anyDisplaced).toBe(true);
  });

  it("constrains displacement to maxDisplacement", () => {
    // maxDisplacement = 40px, radius = 200, maxAngularDisp = 0.2rad
    const positions = makePositions([1.0, 1.001, 1.002, 1.003]); // stellium
    const result = resolveCollisions(positions, 200);
    const maxAngularDisp = 40 / 200;
    for (const pos of result) {
      const disp = Math.abs(pos.displayAngle - pos.originalAngle);
      expect(disp).toBeLessThanOrEqual(maxAngularDisp + 0.001); // small float tolerance
    }
  });

  it("preserves original angles unchanged", () => {
    // resolveCollisions must not mutate the input array
    const angles = [1.0, 1.01];
    const positions = makePositions(angles);
    resolveCollisions(positions, 200);
    // Original positions array should be unmodified
    expect(positions[0]!.originalAngle).toBe(1.0);
    expect(positions[1]!.originalAngle).toBe(1.01);
    expect(positions[0]!.displayAngle).toBe(1.0);
    expect(positions[1]!.displayAngle).toBe(1.01);
  });

  it("handles stellium of 4 planets in 10°", () => {
    const base = 1.0;
    const step = (10 * Math.PI) / 180 / 3;
    const positions = makePositions([
      base,
      base + step,
      base + 2 * step,
      base + 3 * step,
    ]);
    const result = resolveCollisions(positions, 200);
    // Should have resolved without errors and some planets displaced
    expect(result.length).toBe(4);
    const displaced = result.filter((p) => p.displaced);
    expect(displaced.length).toBeGreaterThan(0);
  });

  it("returns same number of positions as input", () => {
    const positions = makePositions([0.5, 1.0, 1.5, 2.0, 2.5]);
    const result = resolveCollisions(positions, 200);
    expect(result.length).toBe(5);
  });

  it("handles single position", () => {
    const positions = makePositions([1.0]);
    const result = resolveCollisions(positions, 200);
    expect(result.length).toBe(1);
    expect(result[0]!.displaced).toBe(false);
  });

  it("handles empty array", () => {
    const result = resolveCollisions([], 200);
    expect(result).toEqual([]);
  });
});
