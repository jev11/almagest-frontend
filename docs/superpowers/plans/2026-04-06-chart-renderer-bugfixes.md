# Chart Renderer Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 confirmed bugs in the chart-renderer package: hardcoded serif fonts, dead degree-labels stub, unused exports, collision wrap-around, background pixel dimensions, and light theme aspect colors.

**Architecture:** Each bug is an independent fix touching isolated files. All fixes are in `packages/chart-renderer/`. Tests use Vitest with the existing test patterns (describe/it blocks, helper factories).

**Tech Stack:** TypeScript, Canvas 2D, Vitest

**Excluded from this plan (not bugs or too large):**
- BUG-002 (SVG adapter mismatch) — feature-level rewrite, not a bugfix
- BUG-004 (aspect zone radius) — spec was updated to document current values; code uses φ-based ratio (0.455) which is an intentional deviation. Update spec to match.
- BUG-005 (element bg opacity) — spec already documents current values (0.22/0.18)
- BUG-006 (sign glyph color) — spec already documents current values (#C4CAD6/#3D4860)
- BUG-007 (responsive scaling) — feature not yet implemented, not a regression

---

### Task 1: BUG-001 — Replace hardcoded `serif` with `theme.fontFamily`

**Files:**
- Modify: `packages/chart-renderer/src/glyphs/planets.ts:36-52`
- Modify: `packages/chart-renderer/src/glyphs/signs.ts:40-56`
- Modify: `packages/chart-renderer/src/layers/planet-ring.ts:280`
- Modify: `packages/chart-renderer/src/layers/house-overlay.ts:124,132`
- Modify: `packages/chart-renderer/src/layers/aspect-web.ts:95`
- Modify: `packages/chart-renderer/src/charts/biwheel.ts:130,139`
- Modify: `packages/chart-renderer/src/adapters/svg.ts:104,215`
- Test: `packages/chart-renderer/src/glyphs/glyphs.test.ts`

- [ ] **Step 1: Add `fontFamily` parameter to `drawGlyph()` in planets.ts**

Change the function signature to accept a fontFamily string and use it instead of `serif`:

```typescript
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
  size: number,
  color: string,
  fontFamily = "serif",
): void {
  if (!glyph) return;
  ctx.save();
  ctx.font = `${size}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x, y);
  ctx.restore();
}
```

- [ ] **Step 2: Add `fontFamily` parameter to `drawSignGlyph()` in signs.ts**

Same pattern:

```typescript
export function drawSignGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
  size: number,
  color: string,
  fontFamily = "serif",
): void {
  if (!glyph) return;
  ctx.save();
  ctx.font = `${size}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x, y);
  ctx.restore();
}
```

- [ ] **Step 3: Replace `serif` in planet-ring.ts**

At line 280, change:
```typescript
ctx.font = token.bold ? `bold ${size}px serif` : `${size}px serif`;
```
to:
```typescript
ctx.font = token.bold ? `bold ${size}px ${theme.fontFamily}` : `${size}px ${theme.fontFamily}`;
```

- [ ] **Step 4: Replace `serif` in house-overlay.ts**

At lines 124 and 132 (inside the cusp label rendering loop), change both occurrences of:
```typescript
ctx.font = `${t.size}px serif`;
```
to:
```typescript
ctx.font = `${t.size}px ${theme.fontFamily}`;
```

Specifically line 124 (measuring widths):
```typescript
ctx.font = `${t.size}px serif`;
```
→
```typescript
ctx.font = `${t.size}px ${theme.fontFamily}`;
```

And line 132 (drawing text):
```typescript
ctx.font = `${tokens[t]!.size}px serif`;
```
→
```typescript
ctx.font = `${tokens[t]!.size}px ${theme.fontFamily}`;
```

- [ ] **Step 5: Replace `serif` in aspect-web.ts**

At line 95, change:
```typescript
ctx.font = `${glyphFontSize}px serif`;
```
to:
```typescript
ctx.font = `${glyphFontSize}px ${theme.fontFamily}`;
```

- [ ] **Step 6: Replace `serif` in biwheel.ts**

At line 130, change:
```typescript
ctx.font = `bold ${fontSize}px serif`;
```
to:
```typescript
ctx.font = `bold ${fontSize}px ${theme.fontFamily}`;
```

At line 139, change:
```typescript
ctx.font = `${fontSize - 2}px serif`;
```
to:
```typescript
ctx.font = `${fontSize - 2}px ${theme.fontFamily}`;
```

- [ ] **Step 7: Replace `serif` in svg.ts**

At line 104 (sign glyphs), change:
```typescript
font-family="serif"
```
to:
```typescript
font-family="${theme.fontFamily}"
```

At line 215 (planet glyphs), change:
```typescript
font-family="serif"
```
to:
```typescript
font-family="${theme.fontFamily}"
```

- [ ] **Step 8: Run tests**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm test --workspace=packages/chart-renderer`
Expected: All tests pass. No functional change to glyph exports.

- [ ] **Step 9: Verify no remaining hardcoded serif**

Run: `grep -rn '"serif"' packages/chart-renderer/src/ --include='*.ts'`
Expected: Zero results.

Run: `grep -rn "serif" packages/chart-renderer/src/ --include='*.ts'`
Expected: Only the default parameter values in `drawGlyph()` and `drawSignGlyph()` (the fallback).

- [ ] **Step 10: Commit**

```bash
git add packages/chart-renderer/src/glyphs/planets.ts packages/chart-renderer/src/glyphs/signs.ts packages/chart-renderer/src/layers/planet-ring.ts packages/chart-renderer/src/layers/house-overlay.ts packages/chart-renderer/src/layers/aspect-web.ts packages/chart-renderer/src/charts/biwheel.ts packages/chart-renderer/src/adapters/svg.ts
git commit -m "fix(chart-renderer): use theme.fontFamily instead of hardcoded serif (BUG-001)"
```

---

### Task 2: BUG-003 — Remove dead degree-labels stub and unused layer toggle

**Files:**
- Delete: `packages/chart-renderer/src/layers/degree-labels.ts`
- Modify: `packages/chart-renderer/src/core/renderer.ts:9,28,55,88`

- [ ] **Step 1: Remove the import and call from renderer.ts**

In `renderer.ts`, remove the import on line 9:
```typescript
import { drawDegreeLabels } from "../layers/degree-labels.js";
```

Remove `degreeLabels?: boolean;` from the `layers` property in `RenderOptions` (line 28).

Remove `degreeLabels: true,` from the defaults object (line 55).

Remove the call on line 88:
```typescript
if (layers.degreeLabels) drawDegreeLabels(ctx, data, theme, dim);
```

- [ ] **Step 2: Delete the stub file**

Delete `packages/chart-renderer/src/layers/degree-labels.ts`.

- [ ] **Step 3: Run tests**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm test --workspace=packages/chart-renderer`
Expected: All tests pass.

- [ ] **Step 4: Run typecheck**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm run typecheck --workspace=packages/chart-renderer`
Expected: No type errors. No other file imports `drawDegreeLabels`.

- [ ] **Step 5: Commit**

```bash
git add packages/chart-renderer/src/core/renderer.ts
git rm packages/chart-renderer/src/layers/degree-labels.ts
git commit -m "fix(chart-renderer): remove dead degree-labels stub and unused layer toggle (BUG-003)"
```

---

### Task 3: BUG-008 — Remove unused exports

**Files:**
- Modify: `packages/chart-renderer/src/glyphs/signs.ts:6-19` (remove `SIGN_ABBREVIATIONS`)
- Modify: `packages/chart-renderer/src/glyphs/aspects.ts` (remove `ASPECT_SYMBOLS`)
- Modify: `packages/chart-renderer/src/glyphs/index.ts:3` (remove re-export)
- Test: `packages/chart-renderer/src/glyphs/glyphs.test.ts`

- [ ] **Step 1: Remove `SIGN_ABBREVIATIONS` from signs.ts**

Delete lines 6-19 (the entire `SIGN_ABBREVIATIONS` constant).

- [ ] **Step 2: Delete aspects.ts entirely**

The entire file `packages/chart-renderer/src/glyphs/aspects.ts` contains only `ASPECT_SYMBOLS` which is unused. Delete it.

- [ ] **Step 3: Remove re-export from index.ts**

Change `packages/chart-renderer/src/glyphs/index.ts` from:
```typescript
export { PLANET_GLYPHS, drawGlyph } from "./planets.js";
export { SIGN_GLYPHS, drawSignGlyph } from "./signs.js";
export { ASPECT_SYMBOLS } from "./aspects.js";
```
to:
```typescript
export { PLANET_GLYPHS, drawGlyph } from "./planets.js";
export { SIGN_GLYPHS, drawSignGlyph } from "./signs.js";
```

- [ ] **Step 4: Run tests and typecheck**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm test --workspace=packages/chart-renderer && npm run typecheck --workspace=packages/chart-renderer`
Expected: All pass. Nothing imports `ASPECT_SYMBOLS` or `SIGN_ABBREVIATIONS`.

- [ ] **Step 5: Commit**

```bash
git rm packages/chart-renderer/src/glyphs/aspects.ts
git add packages/chart-renderer/src/glyphs/signs.ts packages/chart-renderer/src/glyphs/index.ts
git commit -m "fix(chart-renderer): remove unused SIGN_ABBREVIATIONS and ASPECT_SYMBOLS exports (BUG-008)"
```

---

### Task 4: BUG-009 — Fix collision avoidance wrap-around

**Files:**
- Modify: `packages/chart-renderer/src/core/layout.ts:54-67`
- Test: `packages/chart-renderer/src/core/layout.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `layout.test.ts`:

```typescript
it("resolves collision across the 0°/2π boundary", () => {
  // Planet at 359° and 1° are 2° apart — should detect overlap at r=200
  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const positions = makePositions([deg2rad(359), deg2rad(1)]);
  const result = resolveCollisions(positions, 200);
  // After resolution, they should be pushed apart
  // The angular gap should be at least minGlyphGap (34px) at r=200 → ~0.17 rad
  const anyDisplaced = result.some((p) => p.displaced);
  expect(anyDisplaced).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npx vitest run packages/chart-renderer/src/core/layout.test.ts`
Expected: FAIL — the wrap-around pair is not checked.

- [ ] **Step 3: Implement the wrap-around check**

In `layout.ts`, after the inner loop (line 67, after the closing `}` of `for (let i = 0; i < result.length - 1; i++)`), add the circular wrap-around check:

```typescript
    // Circular wrap-around: check last vs first (across 0°/2π boundary)
    if (result.length >= 2) {
      const last = result[result.length - 1]!;
      const first = result[0]!;
      // Angular distance across the wrap: (first + 2π) - last
      const wrapDiff = (first.displayAngle + 2 * Math.PI) - last.displayAngle;
      const wrapPixelDist = wrapDiff * radius;

      if (wrapPixelDist < minGap) {
        const push = (minAngularGap - wrapDiff) / 2;
        last.displayAngle -= push;
        first.displayAngle += push;
      }
    }
```

Replace the comment on line 54:
```typescript
    // Only push adjacent pairs (not circular wrap for simplicity)
```
with:
```typescript
    // Push adjacent pairs apart if they overlap
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npx vitest run packages/chart-renderer/src/core/layout.test.ts`
Expected: All tests PASS including the new wrap-around test.

- [ ] **Step 5: Commit**

```bash
git add packages/chart-renderer/src/core/layout.ts packages/chart-renderer/src/core/layout.test.ts
git commit -m "fix(chart-renderer): handle collision wrap-around at 0°/360° boundary (BUG-009)"
```

---

### Task 5: BUG-010 — Fix background.ts to use CSS dimensions

**Files:**
- Modify: `packages/chart-renderer/src/layers/background.ts`

- [ ] **Step 1: Fix background.ts to use dim parameter**

Replace the entire function body:

```typescript
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  _data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  // Use CSS dimensions via dim (context is already scaled by dpr)
  const size = (dim.radius + 20) * 2; // radius + padding, approximation
  const origin = dim.cx - dim.radius - 20;
  ctx.clearRect(origin, origin, size, size);
  ctx.fillStyle = theme.background;
  ctx.fillRect(origin, origin, size, size);
}
```

Actually, a simpler approach — the renderer sets up the canvas so cx/cy is center and radius covers the drawable area. The background needs to fill the entire CSS viewport. Since the context is scaled by dpr, we should use CSS dimensions. The cleanest fix:

```typescript
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  _data: ChartData,
  theme: ChartTheme,
  _dim: RenderDimensions,
): void {
  // After high-DPI setup, the context is scaled by dpr.
  // Use CSS dimensions (canvas.width/dpr, canvas.height/dpr) for correct fill.
  const canvas = ctx.canvas;
  const dpr = _dim.dpr;
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
}
```

- [ ] **Step 2: Run tests**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm test --workspace=packages/chart-renderer`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/chart-renderer/src/layers/background.ts
git commit -m "fix(chart-renderer): use CSS dimensions in background fill instead of physical pixels (BUG-010)"
```

---

### Task 6: BUG-011 — Align light theme aspect colors with dark theme's design system palette

**Files:**
- Modify: `packages/chart-renderer/src/themes/light.ts:26-36`

The dark theme uses the design system element colors for aspects (Fire=#E85D4A for square/opposition, Air=#5B9FD4 for sextile, etc.). The light theme uses arbitrary custom values. Align them.

- [ ] **Step 1: Update light theme aspect colors**

In `light.ts`, replace the aspect colors to derive from the same element-color mapping as the dark theme, with slightly darkened values suitable for white background:

```typescript
  aspectColors: {
    [AspectType.Conjunction]: "#1A1D24",
    [AspectType.SemiSextile]: "#8892A4",
    [AspectType.Sextile]: "#4A8BC2",      // Air-derived, darkened for white bg
    [AspectType.Square]: "#D4533F",        // Fire-derived, darkened for white bg
    [AspectType.Trine]: "#3A60D0",         // Water-derived blue
    [AspectType.Quincunx]: "#D97706",
    [AspectType.Opposition]: "#D4533F",    // Fire-derived, same as square
    [AspectType.SemiSquare]: "#8892A4",
    [AspectType.Sesquisquare]: "#8892A4",
    [AspectType.Quintile]: "#8892A4",
    [AspectType.BiQuintile]: "#8892A4",
  },
```

The key changes:
- Minor aspects use `text-secondary (#8892A4)` instead of ad-hoc `#B0B8C4`
- Sextile: `#3A7CB5` → `#4A8BC2` (closer to dark theme's `#5B9FD4`, darkened for contrast on white)
- Square/Opposition: `#C94B3A` → `#D4533F` (closer to dark theme's `#E85D4A`, darkened for contrast)
- Trine: `#2850B8` → `#3A60D0` (closer to dark theme's `#4A70E0`)

- [ ] **Step 2: Run tests**

Run: `cd /home/evgeny/projects/almagest/almagest-frontend && npm test --workspace=packages/chart-renderer`
Expected: All tests pass (theme is data, no logic changes).

- [ ] **Step 3: Commit**

```bash
git add packages/chart-renderer/src/themes/light.ts
git commit -m "fix(chart-renderer): align light theme aspect colors with design system palette (BUG-011)"
```

---

### Task 7: Update CHART_RENDERING_SPEC.md and BUG_REPORT.md

**Files:**
- Modify: `CHART_RENDERING_SPEC.md` — update `ASPECT_CIRCLE_RATIO` from `0.40` to `0.455` to match code
- Modify: `BUG_REPORT.md` — mark fixed bugs and document which are not bugs

- [ ] **Step 1: Update CHART_RENDERING_SPEC.md**

Update the ASPECT_CIRCLE_RATIO line from:
```
ASPECT_CIRCLE_RATIO    = 0.40     (aspect circle as fraction of ZODIAC_OUTER)
```
to:
```
ASPECT_CIRCLE_RATIO    = 0.455    (φ-based: planetInner / φ ≈ 0.433, normalized to ZODIAC_OUTER)
```

Update the computed values:
```
  houseNumberOuter:    0.50       (computed: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO + 0.07)
  aspectOuter:         0.432      (computed: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO)
```

- [ ] **Step 2: Update BUG_REPORT.md with resolution status**

Add a resolution status to each bug heading. Example format:
- BUG-001: `[FIXED]`
- BUG-002: `[DEFERRED — feature-level SVG rewrite]`
- BUG-003: `[FIXED]`
- BUG-004: `[NOT A BUG — spec updated, φ-based ratio intentional]`
- BUG-005: `[NOT A BUG — spec already documents current values]`
- BUG-006: `[NOT A BUG — spec already documents current values]`
- BUG-007: `[DEFERRED — feature not yet implemented]`
- BUG-008: `[FIXED]`
- BUG-009: `[FIXED]`
- BUG-010: `[FIXED]`
- BUG-011: `[FIXED]`

- [ ] **Step 3: Update AGENT_CHANGELOG.md**

- [ ] **Step 4: Commit**

```bash
git add CHART_RENDERING_SPEC.md BUG_REPORT.md AGENT_CHANGELOG.md
git commit -m "docs: update spec and bug report with resolution status"
```
