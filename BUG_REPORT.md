# Bug Report — Chart Renderer Code Review

**Date:** 2026-03-29
**Branch:** feature/design
**Reviewer:** Claude Code (automated review)

---

## Critical Issues

### BUG-001: Font family hardcoded as `serif` instead of theme font

**Severity:** High
**Impact:** All chart text renders in Times New Roman instead of Inter

Multiple files use hardcoded `serif` font instead of `theme.fontFamily`:

| File | Location | Code |
|------|----------|------|
| `packages/chart-renderer/src/layers/house-overlay.ts` | cusp label rendering | `ctx.font = \`${GLYPH_SIZES.degreeLabel}px serif\`` |
| `packages/chart-renderer/src/layers/planet-ring.ts` | degree label tokens | `ctx.font = token.bold ? \`bold ${size}px serif\` : \`${size}px serif\`` |
| `packages/chart-renderer/src/glyphs/planets.ts` | `drawGlyph()` | `ctx.font = \`${size}px serif\`` |
| `packages/chart-renderer/src/glyphs/signs.ts` | `drawSignGlyph()` | `ctx.font = \`${size}px serif\`` |
| `packages/chart-renderer/src/adapters/svg.ts` | multiple SVG text elements | `font-family="serif"` |

**Expected:** All text should use `theme.fontFamily` (`"Inter, system-ui, -apple-system, sans-serif"`).

**Fix:** Pass theme font family through to all glyph draw functions and layer renderers. SVG adapter should read from the theme object.

---

### BUG-002: SVG export does not match canvas output

**Severity:** High
**Impact:** Exported SVGs look different from what users see on screen

| Feature | Canvas | SVG |
|---------|--------|-----|
| Degree labels | Merged into planet ring as vertical token stacks | Separate label ring (90-100% radius) with radial text |
| Aspect glyph symbols | Drawn at line midpoints with background | Not rendered |
| Bi-wheel support | Full support | Not implemented |
| Font rendering | Hardcoded `serif` (bug) | Hardcoded `serif` (bug) |
| House cusp labels | Drawn on outer ring with sign glyphs | Not rendered |

**Files:** `packages/chart-renderer/src/adapters/svg.ts`

**Fix:** Either reconcile SVG adapter to mirror canvas drawing operations, or document it as a simplified/schematic export.

---

### BUG-003: `degree-labels.ts` layer is an empty stub

**Severity:** Medium
**Impact:** Dead code in render pipeline; layer toggle for `degreeLabels` does nothing

`packages/chart-renderer/src/layers/degree-labels.ts` is a no-op function. Degree labels are actually rendered inside `planet-ring.ts` as part of the merged glyph+label token system.

This means:
- Toggling `layers.degreeLabels` in `RenderOptions` has no effect
- The layer ordering in `renderer.ts` calls an empty function

**Fix:** Either extract degree label logic from `planet-ring.ts` into `degree-labels.ts`, or remove the stub and the corresponding layer toggle option.

---

## Spec Deviations

### BUG-004: Aspect zone radius significantly smaller than spec

**Severity:** Medium
**Impact:** Aspect lines drawn in a smaller area than designed

| Parameter | Spec | Code | Difference |
|-----------|------|------|------------|
| `aspectOuter` | 0.60 (60% of radius) | `ZODIAC_OUTER * ASPECT_CIRCLE_RATIO` = `0.95 * 0.40` = 0.38 | 37% smaller |

At a 300px radius, aspects are confined to a 114px circle instead of the spec's 180px. This compresses the aspect web and may make intersecting lines harder to distinguish.

**File:** `packages/chart-renderer/src/core/constants.ts:27`

**Fix:** Visual review needed. If the current proportion looks good in practice, update the spec. Otherwise adjust `ASPECT_CIRCLE_RATIO`.

---

### BUG-005: Element background opacity 2.75x higher than spec

**Severity:** Medium
**Impact:** Zodiac ring sign segments are much more saturated than designed

| Theme | Spec | Code |
|-------|------|------|
| Dark | 0.08 (8%) | 0.22 (22%) |
| Light | 0.06 (6%) | 0.18 (18%) |

**Files:**
- `packages/chart-renderer/src/themes/dark.ts:17`
- `packages/chart-renderer/src/themes/light.ts`

**Fix:** Visual review needed. If the higher opacity is intentional, update DESIGN_SYSTEM.md and CHART_RENDERING_SPEC.md.

---

### BUG-006: Sign glyph color deviates from design system

**Severity:** Low
**Impact:** Sign glyphs are lighter than specified

| Token | Spec (DESIGN_SYSTEM.md) | Code |
|-------|------------------------|------|
| `signGlyphColor` | `#8892A4` (text-secondary) | `#C4CAD6` |
| `signDividerStroke` | `#2A3040` (border-subtle) | `#3D4860` |

**File:** `packages/chart-renderer/src/themes/dark.ts:44,9`

---

### BUG-007: Responsive scaling not implemented

**Severity:** Medium
**Impact:** Charts render identically at all sizes; small charts are cluttered, large charts have small glyphs

CHART_RENDERING_SPEC.md requires:

**At 300px diameter (minimum):**
- Hide degree labels
- Reduce glyph sizes by 30%
- Hide 1° and 5° degree tick marks
- Show only tight-orb aspects (< 3°)

**At 900px+ diameter:**
- Increase glyph sizes by 20%
- Show all tick marks

**Scaling factor:** `diameter / 600`, with minimum clamp of 8px for glyphs, 7px for text.

None of this is implemented.

**Files:** `packages/chart-renderer/src/core/renderer.ts`, all layer files

---

## Dead Code

### BUG-008: Unused exports

**Severity:** Low
**Impact:** Increases bundle size; confusing for future developers

| File | Export | Status |
|------|--------|--------|
| `packages/chart-renderer/src/glyphs/signs.ts` | `SIGN_ABBREVIATIONS` | Defined but never imported anywhere |
| `packages/chart-renderer/src/glyphs/aspects.ts` | `ASPECT_SYMBOLS` (SVG paths) | Never used; aspect-web.ts uses its own inline Unicode `ASPECT_GLYPHS` map |

**Fix:** Remove or document as reserved for future UI components.

---

## Minor Issues

### BUG-009: Collision avoidance ignores circular wrap-around

**Severity:** Low
**Impact:** Rare edge case — two planets near 0°/360° boundary may not detect overlap

`packages/chart-renderer/src/core/layout.ts` sorts positions by angle and checks adjacent pairs, but does not check the wrap-around pair (last element vs first element). A planet at 359° and another at 1° (2° apart) would not trigger collision resolution.

**Fix:** After the main loop, check the angular distance between the last and first sorted positions.

---

### BUG-010: `background.ts` uses physical pixel dimensions

**Severity:** Low
**Impact:** Potential rendering artifact on high-DPI displays

`packages/chart-renderer/src/layers/background.ts` uses `ctx.canvas.width` and `ctx.canvas.height` to clear the canvas. After high-DPI setup in `renderer.ts`, these are physical pixel dimensions (CSS size * devicePixelRatio), but the context has already been scaled. The `clearRect` still works correctly because canvas clearRect operates in physical pixels, but the `fillRect` on line 12 should use CSS dimensions via the `dim` parameter instead.

---

### BUG-011: Light theme aspect colors not from design system

**Severity:** Low
**Impact:** Light theme uses custom hex values not defined in DESIGN_SYSTEM.md

`packages/chart-renderer/src/themes/light.ts` uses aspect colors like `#3A7CB5`, `#C94B3A` which are not in the design system palette. The dark theme correctly uses the design system element colors for aspects.

---

## Documentation Issues

### DOC-001: CLAUDE_ASTRO_APP.md references nonexistent files

References to files that don't exist:
- `packages/shared-types/src/requests.ts`
- `packages/shared-types/src/responses.ts`
- `packages/chart-renderer/src/adapters/canvas.ts`
- `packages/chart-renderer/src/charts/radix.ts`
- `apps/web/`, `apps/mobile/`
- `design/*.pen` files (only `.gitkeep` exists)

### DOC-002: PHASE2_TASK_CHECKLIST.md not updated

All 15 tasks still show `[ ]` unchecked despite Phase 2 being complete.

### DOC-003: Spec doesn't document intentional deviations

Several design decisions improved on the original spec but were never documented:
- Unicode glyphs instead of SVG Path2D (better cross-browser support)
- Merged planet + degree label token system (reduces visual clutter)
- Adjusted ring proportions and collision parameters (tuned on real chart data)
- Added angle point labels (ASC/DSC/MC/IC) in planet ring
- Added house cusp degree labels on outer ring

These should be recorded as a decisions log or spec amendments.
