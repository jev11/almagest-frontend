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
    expect(pixelDist).toBeGreaterThan(9.9); // should have separated by ~half minGlyphGap (~10px)
  });

  it("marks displaced positions", () => {
    const positions = makePositions([1.0, 1.01]);
    const result = resolveCollisions(positions, 200);
    const anyDisplaced = result.some((p) => p.displaced);
    expect(anyDisplaced).toBe(true);
  });

  it("constrains displacement to maxDisplacement", () => {
    // COLLISION.maxDisplacement = 55px, radius = 200, maxAngularDisp = 55/200 = 0.275rad
    const positions = makePositions([1.0, 1.001, 1.002, 1.003]); // stellium
    const result = resolveCollisions(positions, 200);
    const maxAngularDisp = 55 / 200;
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

  it("resolves collision across the 0°/2π boundary", () => {
    const deg2rad = (d: number) => (d * Math.PI) / 180;
    const positions = makePositions([deg2rad(359), deg2rad(1)]);
    const result = resolveCollisions(positions, 200);
    const anyDisplaced = result.some((p) => p.displaced);
    expect(anyDisplaced).toBe(true);
  });

  it("pushes planet away from wide blocker by full minGlyphGap", () => {
    // Planet at 1.0 rad, wide blocker at 1.01 rad
    // At radius 200, distance = 0.01 * 200 = 2px — well under minGlyphGap (20px)
    const positions = makePositions([1.0]);
    const result = resolveCollisions(positions, 200, [], [1.01]);
    const dist = Math.abs(result[0]!.displayAngle - 1.01) * 200;
    // Must be at least minGlyphGap (20px) away, not just blockerGap (11px)
    expect(dist).toBeGreaterThanOrEqual(19.5);
  });

  it("pushes planet away from thin blocker by only blockerGap", () => {
    // Same setup but with a thin blocker (cusp line)
    const positions = makePositions([1.0]);
    const result = resolveCollisions(positions, 200, [1.01]);
    const dist = Math.abs(result[0]!.displayAngle - 1.01) * 200;
    // Thin blocker uses cuspBlockerGap (~11px), half the sign glyph width
    expect(dist).toBeGreaterThanOrEqual(10.5);
    expect(dist).toBeLessThan(19.5);
  });

  it("does not trap planet between two adjacent wide blockers", () => {
    // Two wide blockers 22px apart (just above minGlyphGap = 20)
    // Planet between them should be pushed fully outside, not trapped at midpoint
    const spacing = 22 / 200; // 0.11 rad
    const b1 = 1.0;
    const b2 = b1 + spacing;
    const planetAngle = b1 + spacing / 2; // midpoint
    const positions = makePositions([planetAngle]);
    const result = resolveCollisions(positions, 200, [], [b1, b2]);
    const distToB1 = Math.abs(result[0]!.displayAngle - b1) * 200;
    const distToB2 = Math.abs(result[0]!.displayAngle - b2) * 200;
    // Planet must be pushed outside both zones — at least clear of the nearer one
    const minDist = Math.min(distToB1, distToB2);
    expect(minDist).toBeGreaterThanOrEqual(19); // at least clear of the nearer one
  });

  it("resolves planet 2° from angle label without overlap (stellium MC/Neptune case)", () => {
    // Simulates Neptune at 451.9° and MC blocker zone at ~453-468° (chart angles)
    // At radius 174, 2° ecliptic ≈ 6px separation — way under minGlyphGap
    const radius = 174;
    const deg2rad = (d: number) => (d * Math.PI) / 180;

    // MC angle label blocker points (wide blockers, spaced at 36px = ~11.8° at r=174)
    const mcCenter = deg2rad(456.5);
    const span = 36 / radius;
    const mcBlockers = [-1, 0, 1, 2].map((s) => mcCenter + s * span);

    // Neptune at 451.9° chart angle (2° ecliptic from MC)
    const positions = makePositions([deg2rad(451.9)]);
    const result = resolveCollisions(positions, radius, [], mcBlockers);

    // Neptune must be pushed at least minGlyphGap (20px) from the MC label center
    const distFromMcCenter = Math.abs(result[0]!.displayAngle - mcCenter) * radius;
    expect(distFromMcCenter).toBeGreaterThanOrEqual(19);

    // And must not be trapped between blocker points
    for (const blocker of mcBlockers) {
      const dist = Math.abs(result[0]!.displayAngle - blocker) * radius;
      // Either well outside (>20px) or not between any pair
      expect(dist).not.toBeCloseTo(0, 0);
    }
  });

  it("planet conjunct AS is pushed clear without AS moving", () => {
    const radius = 174;

    // AS at exactly π (9 o'clock), small offset for label
    const asCenter = Math.PI + 8 / radius;
    const span = 36 / radius;
    const asBlockers = [-1, 0, 1, 2].map((s) => asCenter + s * span);

    // Planet at π (exactly on the AS axis)
    const positions = makePositions([Math.PI]);
    const result = resolveCollisions(positions, radius, [], asBlockers);

    // Planet must be pushed clear of AS label zone
    const distFromAs = Math.abs(result[0]!.displayAngle - asCenter) * radius;
    expect(distFromAs).toBeGreaterThanOrEqual(19);
  });

  it("planet just before AS (wrap-around near 3π) is pushed clear", () => {
    const radius = 174;

    // AS wide blocker at π + small offset (same as real rendering)
    const asBlocker = Math.PI + 7 / radius;

    // Planet longitude slightly less than ascendant → chart angle wraps to ~3π
    const planetAngle = 3 * Math.PI - 0.02; // visually just before AS
    const positions = makePositions([planetAngle]);
    const result = resolveCollisions(positions, radius, [], [asBlocker]);

    // Circular distance: the planet should be pushed clear of the AS blocker
    const rawDiff = result[0]!.displayAngle - asBlocker;
    const circDist = Math.abs(((rawDiff % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * radius;
    expect(circDist).toBeGreaterThanOrEqual(19);
  });
});
