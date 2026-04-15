# Angle Label Collision Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix planetary labels overlapping with angle labels (AS/DS/MC/IC) by introducing wide-blocker support in the collision resolver so angle labels get the full `minGlyphGap` clearance instead of the halved cusp-line gap.

**Architecture:** Extend `resolveCollisions()` to accept a second blocker array (`wideBlockers`) that uses `minGlyphGap` instead of `blockerGap`. Update `planet-ring.ts` to pass angle blockers as wide blockers with spacing that exceeds `minGlyphGap` to avoid equilibrium traps. Add tests proving the fix works.

**Tech Stack:** TypeScript, Vitest, Canvas 2D rendering

---

### Task 1: Add wide-blocker support to `resolveCollisions()`

**Files:**
- Modify: `packages/chart-renderer/src/core/layout.ts:29-33,84-95`
- Test: `packages/chart-renderer/src/core/layout.test.ts`

- [ ] **Step 1: Write failing test — planet near a wide blocker is pushed to full minGlyphGap distance**

Add to `packages/chart-renderer/src/core/layout.test.ts`, inside the `describe("resolveCollisions")` block:

```typescript
it("pushes planet away from wide blocker by full minGlyphGap", () => {
  // Planet at 1.0 rad, wide blocker at 1.01 rad
  // At radius 200, distance = 0.01 * 200 = 2px — well under minGlyphGap (34px)
  const positions = makePositions([1.0]);
  const result = resolveCollisions(positions, 200, [], [1.01]);
  const dist = Math.abs(result[0]!.displayAngle - 1.01) * 200;
  // Must be at least minGlyphGap (34px) away, not just blockerGap (17px)
  expect(dist).toBeGreaterThanOrEqual(33.5);
});

it("pushes planet away from thin blocker by only blockerGap", () => {
  // Same setup but with a thin blocker (cusp line)
  const positions = makePositions([1.0]);
  const result = resolveCollisions(positions, 200, [1.01]);
  const dist = Math.abs(result[0]!.displayAngle - 1.01) * 200;
  // Thin blocker uses half gap (~17px)
  expect(dist).toBeGreaterThanOrEqual(16.5);
  expect(dist).toBeLessThan(33.5);
});

it("does not trap planet between two adjacent wide blockers", () => {
  // Two wide blockers 36px apart (just above minGlyphGap)
  // Planet between them should be pushed fully outside, not trapped at midpoint
  const spacing = 36 / 200; // 0.18 rad
  const b1 = 1.0;
  const b2 = b1 + spacing;
  const planetAngle = b1 + spacing / 2; // midpoint
  const positions = makePositions([planetAngle]);
  const result = resolveCollisions(positions, 200, [], [b1, b2]);
  const distToB1 = Math.abs(result[0]!.displayAngle - b1) * 200;
  const distToB2 = Math.abs(result[0]!.displayAngle - b2) * 200;
  // Planet must be pushed outside both zones — at least minGlyphGap from one of them
  const minDist = Math.min(distToB1, distToB2);
  expect(minDist).toBeGreaterThanOrEqual(16); // at least clear of the nearer one
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/chart-renderer && npx vitest run src/core/layout.test.ts`
Expected: New tests FAIL — `resolveCollisions` doesn't accept a 4th argument yet. The first test gets only ~17px clearance (thin blocker gap).

- [ ] **Step 3: Add `wideBlockers` parameter to `resolveCollisions()`**

In `packages/chart-renderer/src/core/layout.ts`, change the function signature (lines 29-34) from:

```typescript
export function resolveCollisions(
  positions: GlyphPosition[],
  radius: number,
  /** Fixed angles (radians) that repel labels but don't move — e.g. house cusp lines */
  blockers: number[] = [],
): GlyphPosition[] {
```

to:

```typescript
export function resolveCollisions(
  positions: GlyphPosition[],
  radius: number,
  /** Fixed angles (radians) that repel labels but don't move — e.g. house cusp lines */
  blockers: number[] = [],
  /** Wide blockers that need full minGlyphGap clearance — e.g. angle labels (AS/DS/MC/IC) */
  wideBlockers: number[] = [],
): GlyphPosition[] {
```

Then, after the existing blocker loop (lines 84-95), add a second loop for wide blockers using `minAngularGap` instead of `blockerAngularGap`:

Replace the blocker repulsion section (lines 84-95):

```typescript
    // One-sided repulsion from fixed blocker angles (house cusps, etc.)
    for (const pos of result) {
      for (const blocker of blockers) {
        const diff = pos.displayAngle - blocker;
        const pixelDist = Math.abs(diff) * radius;
        if (pixelDist < blockerGap) {
          const push = blockerAngularGap - Math.abs(diff);
          // Push away from blocker; if exactly on it, push in increasing direction
          pos.displayAngle += (diff >= 0 ? 1 : -1) * push;
        }
      }
    }
```

with:

```typescript
    // One-sided repulsion from thin blocker angles (house cusp lines)
    for (const pos of result) {
      for (const blocker of blockers) {
        const diff = pos.displayAngle - blocker;
        const pixelDist = Math.abs(diff) * radius;
        if (pixelDist < blockerGap) {
          const push = blockerAngularGap - Math.abs(diff);
          pos.displayAngle += (diff >= 0 ? 1 : -1) * push;
        }
      }
    }

    // One-sided repulsion from wide blocker angles (angle labels AS/DS/MC/IC)
    for (const pos of result) {
      for (const blocker of wideBlockers) {
        const diff = pos.displayAngle - blocker;
        const pixelDist = Math.abs(diff) * radius;
        if (pixelDist < minGap) {
          const push = minAngularGap - Math.abs(diff);
          pos.displayAngle += (diff >= 0 ? 1 : -1) * push;
        }
      }
    }
```

- [ ] **Step 4: Run all layout tests**

Run: `cd packages/chart-renderer && npx vitest run src/core/layout.test.ts`
Expected: ALL PASS (including the 3 new tests)

- [ ] **Step 5: Commit**

```bash
git add packages/chart-renderer/src/core/layout.ts packages/chart-renderer/src/core/layout.test.ts
git commit -m "fix: add wide-blocker support to resolveCollisions for angle labels"
```

---

### Task 2: Use wide blockers for angle labels in planet ring

**Files:**
- Modify: `packages/chart-renderer/src/layers/planet-ring.ts:118-140`

- [ ] **Step 1: Change angle blocker spacing and pass as wide blockers**

In `packages/chart-renderer/src/layers/planet-ring.ts`, first add the `COLLISION` import. Change line 3 from:

```typescript
import { RING_PROPORTIONS, glyphSizes } from "../core/constants.js";
```

to:

```typescript
import { RING_PROPORTIONS, COLLISION, glyphSizes } from "../core/constants.js";
```

Then replace lines 118-140:

```typescript
  // Angle labels are fixed (not movable). Remove them from the planet pool
  // and add their positions as blockers so the resolver pushes planets away.
  // Fan out multiple blocker points to cover the full angular width of each label.
  // Angle labels occupy significant radial space (glyph + degree + sign + minute),
  // so the exclusion zone must be wide enough to prevent overlaps.
  const axisOffsetRad = 8 / planetRingR;
  const angleLabelSpan = 18 / planetRingR; // step between blocker points
  const angleBlockerPositions: number[] = [];
  for (const ap of anglePoints) {
    const center = longitudeToAngle(ap.lon, ascendant) + axisOffsetRad;
    for (let step = -1; step <= 2; step++) {
      angleBlockerPositions.push(center + step * angleLabelSpan);
    }
  }

  // Remove angle points from planet positions — they'll be rendered separately
  const planetPositions = glyphPositions.filter(
    (pos) => !anglePoints.some((ap) => ap.id === pos.body),
  );

  // Resolve collisions for planet labels only, with angle + cusp blockers
  const allBlockers = [...cuspBlockers, ...angleBlockerPositions];
  const resolved = resolveCollisions(planetPositions, planetRingR, allBlockers);
```

with:

```typescript
  // Angle labels are fixed (not movable). Remove them from the planet pool
  // and pass their positions as wide blockers so the resolver pushes planets
  // away by the full minGlyphGap (not the halved cusp-line gap).
  // Spacing between blocker points must exceed minGlyphGap to prevent
  // equilibrium traps where a planet settles between two adjacent points.
  const axisOffsetRad = 8 / planetRingR;
  const angleLabelSpan = (COLLISION.minGlyphGap + 2) / planetRingR;
  const angleBlockerPositions: number[] = [];
  for (const ap of anglePoints) {
    const center = longitudeToAngle(ap.lon, ascendant) + axisOffsetRad;
    for (let step = -1; step <= 2; step++) {
      angleBlockerPositions.push(center + step * angleLabelSpan);
    }
  }

  // Remove angle points from planet positions — they'll be rendered separately
  const planetPositions = glyphPositions.filter(
    (pos) => !anglePoints.some((ap) => ap.id === pos.body),
  );

  // Resolve collisions: cusp lines as thin blockers, angle labels as wide blockers
  const resolved = resolveCollisions(planetPositions, planetRingR, cuspBlockers, angleBlockerPositions);
```

Key changes:
- `angleLabelSpan` now uses `COLLISION.minGlyphGap + 2` (36px) instead of hardcoded `18` — spacing exceeds `minGlyphGap` so repulsion zones don't overlap and trap planets
- Angle blockers passed as the 4th arg (`wideBlockers`) instead of merged with cusp blockers
- Cusp blockers stay as thin blockers (3rd arg)

- [ ] **Step 2: Run the full chart-renderer test suite**

Run: `cd packages/chart-renderer && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add packages/chart-renderer/src/layers/planet-ring.ts
git commit -m "fix: pass angle labels as wide blockers to prevent planet-angle overlap"
```

---

### Task 3: Add integration test for planet-near-angle scenario

**Files:**
- Modify: `packages/chart-renderer/src/core/layout.test.ts`

- [ ] **Step 1: Write test simulating the Neptune-near-MC scenario from the stellium chart**

Add to `packages/chart-renderer/src/core/layout.test.ts`, inside the `describe("resolveCollisions")` block:

```typescript
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

  // Neptune must be pushed at least minGlyphGap (34px) from the MC label center
  const distFromMcCenter = Math.abs(result[0]!.displayAngle - mcCenter) * radius;
  expect(distFromMcCenter).toBeGreaterThanOrEqual(33);

  // And must not be trapped between blocker points
  for (const blocker of mcBlockers) {
    const dist = Math.abs(result[0]!.displayAngle - blocker) * radius;
    // Either well outside (>34px) or not between any pair
    expect(dist).not.toBeCloseTo(0, 0);
  }
});

it("planet conjunct AS is pushed clear without AS moving", () => {
  const radius = 174;
  const deg2rad = (d: number) => (d * Math.PI) / 180;

  // AS at exactly π (9 o'clock), small offset for label
  const asCenter = Math.PI + 8 / radius;
  const span = 36 / radius;
  const asBlockers = [-1, 0, 1, 2].map((s) => asCenter + s * span);

  // Planet at π (exactly on the AS axis)
  const positions = makePositions([Math.PI]);
  const result = resolveCollisions(positions, radius, [], asBlockers);

  // Planet must be pushed clear of AS label zone
  const distFromAs = Math.abs(result[0]!.displayAngle - asCenter) * radius;
  expect(distFromAs).toBeGreaterThanOrEqual(33);
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/chart-renderer && npx vitest run src/core/layout.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add packages/chart-renderer/src/core/layout.test.ts
git commit -m "test: add integration tests for planet-near-angle collision scenarios"
```

---

### Task 4: Verify with full test suite

- [ ] **Step 1: Run the complete chart-renderer test suite**

Run: `cd packages/chart-renderer && npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run type checking**

Run: `cd packages/chart-renderer && npx tsc --noEmit`
Expected: Clean (no errors)

- [ ] **Step 3: Verify no accidental changes**

Run: `git diff --stat`
Expected: Only `layout.ts`, `layout.test.ts`, and `planet-ring.ts` modified.
