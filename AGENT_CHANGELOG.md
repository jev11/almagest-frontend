# Agent Changelog

## 2026-04-06 — Custom SVG Path Glyphs (cross-browser glyph rendering)

### Change
Replaced all Unicode astrological symbol rendering with custom SVG path data rendered via Canvas `Path2D` API. This eliminates cross-browser rendering differences caused by font fallback, `measureText()` variance, and `textBaseline` inconsistencies between Firefox and Chrome.

### Files Added
- `packages/chart-renderer/src/glyphs/draw.ts` — `drawPathGlyph()` function using Path2D
- `packages/chart-renderer/src/glyphs/planet-paths.ts` — 17 planet SVG paths + width ratios
- `packages/chart-renderer/src/glyphs/sign-paths.ts` — 12 zodiac sign SVG paths + width ratios
- `packages/chart-renderer/src/glyphs/aspect-paths.ts` — 11 aspect SVG paths + width ratios

### Files Modified
- `zodiac-ring.ts`, `planet-ring.ts`, `house-overlay.ts`, `aspect-web.ts` — migrated to path rendering
- `adapters/svg.ts` — SVG `<text>` elements replaced with `<path>` elements
- `charts/biwheel.ts` — migrated transit planet glyphs to path rendering
- `glyphs/index.ts` — updated re-exports
- `glyphs/glyphs.test.ts` — tests for key coverage, width bounds, path validity

### Files Deleted
- `packages/chart-renderer/src/glyphs/planets.ts` — old Unicode planet glyphs
- `packages/chart-renderer/src/glyphs/signs.ts` — old Unicode sign glyphs

### Decisions Made
- **Calligraphic style** chosen for glyph design (variable stroke width, traditional manuscript feel)
- **100×100 design grid** for SVG paths — scales to any pixel size
- **Fill-only rendering** — all paths are closed shapes (lines converted to thin rectangles/polygons)
- **Width ratios** per glyph for deterministic layout (replaces `measureText()` for glyph tokens)
- **Degree numbers, house numbers, axis labels, retrograde ℞ stay as `fillText()`** — these are standard characters that render consistently across browsers

---

## 2026-04-06 — Open-Path Glyph Fixes (fill-only rendering)

### Change
Converted all remaining open SVG sub-paths in glyph files to closed filled shapes. The renderer uses `ctx.fill()` only — any path without `Z` close has zero fill area and is invisible.

### Files Modified
- `packages/chart-renderer/src/glyphs/sign-paths.ts` — fixed taurus horns, cancer (2 spirals), leo (3 segments), virgo (3 strokes), libra (bar + arch + bottom curve), scorpio (3 strokes + arrow), capricorn (looping stroke), pisces (2 parentheses + bar)
- `packages/chart-renderer/src/glyphs/planet-paths.ts` — fixed NORTH_NODE and SOUTH_NODE corner bracket L-shapes and stems
- `packages/chart-renderer/src/glyphs/aspect-paths.ts` — fixed conjunction stem, opposition connector, semi_sextile stem and bar

### Decisions Made
- **Straight lines → 4px-wide rectangles:** `M x1 y1 L x2 y2` converted to 4-unit-wide closed rect
- **Open curves → closed ribbons:** Offset control points ~3 units and close to form a thin filled band
- **L-shaped brackets → closed L-polygons:** Corner bracket M/L chains converted to closed 4px-wide L-shapes
- **Scorpio arrow barbs** converted to a single closed polygon tracing both barb lines and returning through the main stroke

---

## 2026-04-06 — Review Findings Bug Fixes (review_findings-1.md)

### Change
Fixed 5 of 6 findings from code review. Finding 6 (auth tokens in localStorage) deferred — requires backend cookie auth support.

### Bugs Fixed
- **Finding 1 (High):** Cloud chart detail navigation now works. `chart-view.tsx` reads `?source=cloud` search param and fetches via `client.getCloudChart(id)`, converting `CloudChart` to `StoredChart` for rendering. Shows cloud-specific error on fetch failure.
- **Finding 2 (High):** Precise API aspects no longer overwritten with approximate aspects. Exported `calculateAspects()` from `approx-engine` and used it to recalculate aspects from the precise positions returned by the API, instead of discarding them via `calculateApproximate()`.
- **Finding 3 (Medium):** Sidereal chart edits now preserve `ayanamsa`. Added ayanamsa state to the edit dialog, synced from stored request, conditionally shown when zodiac type is sidereal, and included in the recalculation request.
- **Finding 4 (Medium):** Fixed stale `aspectMap` memoization in `aspect-grid.tsx` — added `gridBodies` to the dependency array so node type changes correctly update angle-to-node aspects.
- **Finding 5 (Medium):** Added `typecheck` script to `apps/web/package.json`. Fixed `use-settings.test.ts` to include `nodeType` and `timeFormat` in state setup. Removed unused `defaults` binding in `transits.tsx`.

### Deferred
- **Finding 6 (Medium):** Auth token storage hardening. Requires backend support for httpOnly cookie-based refresh tokens before the frontend can migrate.

### Decisions Made
- **`calculateAspects` exported:** Made the previously-internal `calculateAspects()` function a public export from `@astro-app/approx-engine`. This enables recalculating aspects from any set of positions (e.g., precise API positions) with user orb settings, without re-running the full approximate calculation.
- **Cloud chart conversion:** `CloudChart` is converted to `StoredChart` in-memory for rendering. Cloud charts are not automatically cached to IndexedDB — the user can explicitly save them.

## 2026-04-06 — Chart Renderer Bug Fixes (BUG_REPORT.md)

### Change
Fixed 6 bugs from BUG_REPORT.md, triaged remaining 5 as not-bugs or deferred features.

### Bugs Fixed
- **BUG-001:** Replaced all hardcoded `serif` font references (8 files) with `theme.fontFamily`. Added `fontFamily` default parameter to `drawGlyph()` and `drawSignGlyph()` for backward compatibility.
- **BUG-003:** Deleted empty `degree-labels.ts` stub and removed non-functional `degreeLabels` layer toggle from `RenderOptions`.
- **BUG-008:** Removed unused `SIGN_ABBREVIATIONS` constant and deleted `aspects.ts` (`ASPECT_SYMBOLS` was never imported).
- **BUG-009:** Added circular wrap-around check in `resolveCollisions()` so planets near 0°/360° boundary are collision-resolved.
- **BUG-010:** Changed `background.ts` to use CSS dimensions (`canvas.width / dpr`) instead of physical pixel dimensions for `fillRect`.
- **BUG-011:** Aligned light theme aspect colors with dark theme's design system palette. Minor aspects now use `text-secondary (#8892A4)`.

### Triaged as Not Bugs
- **BUG-004, BUG-005, BUG-006:** CHART_RENDERING_SPEC.md was already updated to document the current values. These are intentional design decisions, not regressions.

### Deferred
- **BUG-002:** SVG adapter rewrite — feature-level work, not a bugfix.
- **BUG-007:** Responsive scaling — feature not yet implemented.

### Decisions Made
- **Spec updated:** CHART_RENDERING_SPEC.md `ASPECT_CIRCLE_RATIO` corrected from `0.40` to `0.455` to match the φ-based value in code.
- **Light theme aspect color strategy:** Derive from same element-color mapping as dark theme, with slightly darkened values for white background contrast. Minor aspects use `text-secondary` instead of ad-hoc grays.

## 2026-04-03 — Settings: Save/Cancel Instead of Immediate Apply

### Change
Settings page no longer applies changes immediately. All edits are held in local React state (draft). Save and Cancel buttons appear when there are unsaved changes. Settings are only persisted to Zustand/localStorage when Save is pressed.

### Decisions Made

**Draft state pattern:** Local `useState` holds a copy of settings. All form controls read/write the draft. On Save, draft values are committed to the Zustand store. On Cancel, draft is reset to current store values. This avoids any intermediate state leaking to other parts of the app.

**Conditional button visibility:** Save/Cancel buttons only appear when the draft differs from the persisted settings (`isDirty` flag). Reset to defaults still works immediately (resets both store and draft).

## 2026-04-02 — Golden Ratio Design System

### Change
Introduced golden ratio (φ = 1.618) proportions across the entire frontend: spacing, typography tokens, page layout columns, sidebar dimensions, and component sizing.

### Decisions Made

**Fibonacci spacing scale (base 5px):** Spacing tokens are Fibonacci numbers: 5, 8, 13, 21, 34, 55, 89px. Each step is ×1.618 of the previous. Chosen over base-4 because the values land on actual Fibonacci numbers — thematically fitting for an astrology app.

**Typography scale (base 15px):** Matches existing body text size. Scale: 9, 12, 15, 19, 24, 39, 63px. Intermediate steps use √φ for finer granularity. Line heights use Fibonacci numbers.

**Layout: 61.8/38.2 column split:** Home page and chart-view use `flex: 1.618` / `flex: 1` for content columns. Simple φ split chosen over nested recursive φ — cleaner to implement, easier to maintain.

**Sidebar: 89px / 144px:** Consecutive Fibonacci numbers (ratio = φ). Expanded width narrower than before (was 240px), requiring tighter nav item padding and truncated labels. "Free Plan" text removed from user area to save space.

**Additive tokens:** φ spacing utilities (`gap-phi-4`, `p-phi-3`, etc.) are added alongside existing Tailwind spacing — no existing utilities removed.

### Known Tradeoffs
- Sidebar at 144px expanded is noticeably narrower than the previous 240px. Nav labels must be short.
- Chart view right panel is now proportional instead of fixed 360px — on very wide screens it may be wider than needed.
- At tablet-portrait widths, the 38.2% right column may be cramped. Responsive breakpoints deferred to future polish.

## 2026-04-02 — Home Page Performance Optimization

### Change
Optimize Home page load time: instant rendering on first visit, near-zero latency on return visits.

### Decisions Made

**Data caching approach (over component caching):**
Sky data (planet positions, aspects) is stored in a session-scoped Zustand store (`sky-store`). Navigating away and back to Home reuses cached data instead of re-computing. Data refreshes when stale (>5 minutes).

**Remove geolocation gate:**
Previously, all Home widgets waited for `navigator.geolocation.getCurrentPosition()` (up to 5-second timeout) before rendering anything. Now: render immediately with cached or default (London) coordinates. Geolocation resolves in background and updates in-place. User's location is cached in localStorage for future sessions.

**Eager HomePage loading:**
HomePage removed from React.lazy() code splitting. As the primary destination, it's included in the main bundle to eliminate chunk-fetch latency on navigation.

**Deferred AspectsTimeline:**
The 40-call `calculateApproximate` loop moved from synchronous `useMemo` to `useEffect` + `requestAnimationFrame`. Above-the-fold widgets (chart wheel, moon card, planet card) paint first; timeline fills in one frame later.

**MoonCard consolidation:**
Two identical `calculateApproximate(now, 0, 0)` calls merged into one.

### Known Tradeoff
- Chart may briefly show London-based positions before geolocation resolves (only on first-ever visit or if location permission is denied). The visual shift is minimal — planet longitudes barely change with location; only house cusps and ascendant shift.
- AspectsTimeline shows a brief "Loading..." placeholder before data arrives (~16ms, usually imperceptible).

## 2026-03-31 — Aspect Timeline: Triangle/Bell Curve Area Graphs

### Change
Replace flat color bars in `AspectsTimeline` with soft bell curve area graphs per aspect row.

### Decisions Made

**Visual style:** Soft gaussian-style bell curve with gradient fill (top opacity 0.85 → bottom 0.08), colored stroke along top edge, dot at peak. Row height 36px.

**Data computation approach: Sub-day sampling (Option A)**
Sample `calculateApproximate` every 6 hours across the 10-day window (40 calls total). Use real `aspect.orb` value at each sample → `intensity = 1 - orb/maxOrb`. Plot via SVG smooth bezier path through real data. Produces naturally asymmetric bell (applying side steeper than separating).

**Alternatives considered:**
- Option B — Keep 10 daily noon samples, switch `activeDays: boolean[]` → `orbValues: (number|null)[]`, render bezier through 10 points. Simpler but peak snaps to nearest noon.
- Option C — Binary search for exact peak moment, draw mathematical gaussian centered on it. Smooth/accurate peak but synthetic shape, doesn't reflect real orbital asymmetry.

**Why A over B/C:** All computation is local (VSOP87/ELP2000 in `approx-engine`, no backend calls). 40 calls complete in <1ms total. Real orb data produces naturally organic, informative shapes.

### Known Tradeoff

40 `calculateApproximate` calls run synchronously on first mount (guarded by `useMemo`). At <1ms each, total is ~40ms — acceptable for now. If mobile performance becomes an issue, offload to a Web Worker or use `useEffect`+state to defer after first paint.

### Implementation Notes

- Pure math helpers extracted to `aspects-timeline-utils.ts` for independent testability
- `MAX_ORB` map in `aspects-timeline.tsx` mirrors `ASPECT_DEFINITIONS` in approx-engine — if engine orb values change, this table must be updated too
- `orbIntensity` clamps output to `[0, 1]` including negative orb inputs (defensive)
