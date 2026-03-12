# Phase 2: Task Checklist

## Implementation Order

Work through these tasks in order. Each builds on the previous.

---

### Task 1: Monorepo Scaffolding
**Goal:** Empty monorepo that builds and runs.

- [ ] Initialize root `package.json` with npm workspaces config
- [ ] Create `tsconfig.base.json` with shared TypeScript settings
- [ ] Create `packages/shared-types/` with package.json and tsconfig
- [ ] Create `packages/chart-renderer/` with package.json and tsconfig
- [ ] Create `packages/astro-client/` with package.json and tsconfig (empty placeholder)
- [ ] Create `packages/approx-engine/` with package.json and tsconfig (empty placeholder)
- [ ] Set up Vitest in root and per-package
- [ ] Verify: `npm install` succeeds
- [ ] Verify: `npm run build --workspaces` succeeds (even with empty packages)
- [ ] Verify: `npm test --workspaces` runs (even with 0 tests)
- [ ] Create `design/` directory for .pen files

**Definition of done:** Monorepo structure builds cleanly. All workspace commands work.

---

### Task 2: shared-types Package
**Goal:** All TypeScript types matching the backend API contract.

- [ ] Create `src/enums.ts` — all enums (CelestialBody, ZodiacSign, HouseSystem, AspectType, ZodiacType, Element)
- [ ] Create `src/models.ts` — all interfaces (CelestialPosition, ZodiacPosition, Aspect, HouseData, ChartMetadata, ChartData)
- [ ] Create `src/constants.ts` — SIGN_ELEMENT map, SIGN_ORDER array
- [ ] Create `src/index.ts` — re-export everything
- [ ] Verify: package builds and produces .d.ts declaration files
- [ ] Verify: chart-renderer can import types from shared-types

**Definition of done:** Types compile, match the API contract in API_CONTRACT.md, and are importable by other packages.

---

### Task 3: Geometry Module
**Goal:** All spatial math for the chart wheel.

- [ ] Create `chart-renderer/src/core/geometry.ts` with:
  - [ ] `longitudeToAngle()` — longitude + ascendant → canvas angle
  - [ ] `polarToCartesian()` — angle + radius → x,y
  - [ ] `angularDistance()` — shortest arc between longitudes
  - [ ] `drawArc()` — Canvas arc drawing helper
  - [ ] `normalizeLongitude()` — clamp to 0-360
  - [ ] `signIndexFromLongitude()` — longitude → sign index (0-11)
- [ ] Write comprehensive tests in `core/geometry.test.ts`:
  - [ ] Ascendant placement at 9 o'clock
  - [ ] Descendant at 3 o'clock
  - [ ] 360° wrap-around
  - [ ] Polar to cartesian at cardinal angles
  - [ ] Angular distance across 0°/360° boundary
  - [ ] Sign index boundaries (0°=Aries, 30°=Taurus, etc.)

**Definition of done:** All geometry functions pass tests. Pure math, no canvas dependency.

---

### Task 4: Constants + Theme System
**Goal:** Ring proportions, glyph sizes, and theme interface with dark/light implementations.

- [ ] Create `chart-renderer/src/core/constants.ts` with RING_PROPORTIONS, GLYPH_SIZES, COLLISION config, ASPECT_ANGLES
- [ ] Create `chart-renderer/src/themes/types.ts` — ChartTheme interface
- [ ] Create `chart-renderer/src/themes/dark.ts` — dark theme with all design system colors
- [ ] Create `chart-renderer/src/themes/light.ts` — light theme variant
- [ ] Verify: themes conform to ChartTheme interface (TypeScript checks)

**Definition of done:** Constants defined, both themes created and type-checked.

---

### Task 5: Glyph System
**Goal:** Planet, sign, and aspect glyphs renderable on Canvas.

- [ ] Create `chart-renderer/src/glyphs/planets.ts` — planet glyph SVG paths + `drawGlyph()` function
- [ ] Create `chart-renderer/src/glyphs/signs.ts` — zodiac sign glyph SVG paths
- [ ] Create `chart-renderer/src/glyphs/aspects.ts` — aspect symbol SVG paths
- [ ] Implement `drawGlyph()` using Canvas `Path2D` API
- [ ] Write test: `drawGlyph()` doesn't throw for each glyph
- [ ] Create visual test: HTML page rendering all glyphs in a grid

NOTE: Start with simple placeholder SVG paths (basic geometric shapes). Replace with designed glyphs from the design sprint. The rendering code is the same regardless of path data.

**Definition of done:** All glyphs render on canvas without errors. Visual test shows all glyphs.

---

### Task 6: Background + Zodiac Ring Layers
**Goal:** First visible output — the zodiac wheel ring.

- [ ] Create `chart-renderer/src/layers/background.ts` — clear + fill background
- [ ] Create `chart-renderer/src/layers/zodiac-ring.ts`:
  - [ ] Draw 12 arc segments colored by element (at low opacity)
  - [ ] Draw sign divider lines at every 30°
  - [ ] Draw sign glyphs centered in each segment
  - [ ] Draw degree tick marks (1°, 5°, 10° intervals)
  - [ ] Rotate entire ring so Ascendant sits at left
- [ ] Create test data: a hardcoded ChartData object for testing
- [ ] Create visual test harness: HTML page with canvas + renderer call
- [ ] Verify: ring renders correctly with correct sign order and rotation

**Definition of done:** Zodiac ring renders with sign colors, glyphs, and degree ticks. Ascendant at 9 o'clock.

---

### Task 7: House Overlay Layer
**Goal:** House cusp lines and numbers drawn on the wheel.

- [ ] Create `chart-renderer/src/layers/house-overlay.ts`:
  - [ ] Draw cusp lines from planet ring inner edge to house inner edge
  - [ ] ASC (cusp 1) and MC (cusp 10) lines use angleStroke color and wider width
  - [ ] Draw house numbers centered between cusps at ~50% house zone radius
- [ ] Test with multiple house systems (Placidus, Whole Sign, Equal)
- [ ] Verify: Whole Sign cusps are at 0° of each sign
- [ ] Verify: Equal cusps are exactly 30° apart
- [ ] Verify: ASC and MC lines are visually distinct

**Definition of done:** House cusps render correctly for all house systems. ASC/MC emphasized.

---

### Task 8: Collision Avoidance
**Goal:** Overlapping planet labels separate cleanly.

- [ ] Create `chart-renderer/src/core/layout.ts`:
  - [ ] `GlyphPosition` interface
  - [ ] `resolveCollisions()` — spring-force algorithm
  - [ ] Track displacement state (for leader lines)
- [ ] Write tests:
  - [ ] Well-spaced positions unchanged
  - [ ] Two overlapping glyphs separate
  - [ ] 4-planet stellium resolves without overflow
  - [ ] Displacement stays within maxDisplacement
- [ ] Verify with visual test: create test data with a stellium

**Definition of done:** Collision avoidance resolves overlaps. Tests pass including stellium case.

---

### Task 9: Planet Ring Layer
**Goal:** Planet glyphs positioned correctly on the wheel.

- [ ] Create `chart-renderer/src/layers/planet-ring.ts`:
  - [ ] Calculate angle for each planet from longitude + ascendant
  - [ ] Run collision avoidance on positions
  - [ ] Draw planet glyphs at resolved positions
  - [ ] Draw leader lines from displaced glyphs to exact zodiac position
  - [ ] Retrograde planets use retrograde color
- [ ] Test with test data containing:
  - [ ] Evenly spaced planets (no collision)
  - [ ] Stellium (collision avoidance active)
  - [ ] Retrograde planet

**Definition of done:** All planets render at correct positions. Stelliums handled with leader lines. Retrograde visually distinct.

---

### Task 10: Aspect Web Layer
**Goal:** Aspect lines connecting planets in the chart center.

- [ ] Create `chart-renderer/src/layers/aspect-web.ts`:
  - [ ] For each aspect: draw line from body1 position to body2 position
  - [ ] Lines drawn within aspect zone radius
  - [ ] Color by aspect type from theme
  - [ ] Opacity mapped to orb (0-1°: 1.0, 1-3°: 0.7, 3-5°: 0.4, 5+°: 0.2)
  - [ ] Major aspects: solid lines
  - [ ] Minor aspects: dashed lines
- [ ] Test: verify aspect colors, opacity mapping, and dash patterns
- [ ] Verify visually: aspect web looks clean, not cluttered

**Definition of done:** All aspects render with correct colors, opacity, and line styles.

---

### Task 11: Degree Labels Layer
**Goal:** Position labels showing exact degree/minute for each planet.

- [ ] Create `chart-renderer/src/layers/degree-labels.ts`:
  - [ ] Format: "24°13'" for each planet
  - [ ] Append "℞" for retrograde planets
  - [ ] Position in the label ring (outermost)
  - [ ] Use collision avoidance (share positions with planet ring)
  - [ ] Draw leader lines where labels are displaced
- [ ] Verify: labels are legible at 600px wheel size
- [ ] Verify: labels don't overlap each other or the zodiac ring

**Definition of done:** All planets have readable degree labels. No overlaps.

---

### Task 12: Main Renderer Integration
**Goal:** `renderRadix()` draws a complete chart from ChartData.

- [ ] Create `chart-renderer/src/core/renderer.ts`:
  - [ ] `renderRadix()` — orchestrates all layers
  - [ ] Handle high-DPI rendering (devicePixelRatio)
  - [ ] Support layer toggling via options
  - [ ] Support custom padding
- [ ] Create `chart-renderer/src/index.ts` — public API exports
- [ ] Integration test: render a full chart, verify no errors
- [ ] Visual test: compare rendered chart against designed reference
- [ ] Test at different sizes: 300px, 600px, 900px, 1200px

**Definition of done:** `renderRadix()` produces a complete, correct natal chart at any size.

---

### Task 13: Bi-Wheel Renderer
**Goal:** Two concentric chart rings for transits/synastry.

- [ ] Create `chart-renderer/src/charts/biwheel.ts`:
  - [ ] Inner wheel: natal chart at reduced radius (~65% of total)
  - [ ] Outer ring: second chart's planet positions
  - [ ] Inter-chart aspect lines between inner and outer planets
- [ ] Implement `renderBiwheel()` in renderer.ts
- [ ] Test with two different ChartData objects

**Definition of done:** Bi-wheel renders two charts concentrically with inter-chart aspects.

---

### Task 14: SVG Export Adapter
**Goal:** Export chart as SVG string for static images.

- [ ] Create `chart-renderer/src/adapters/svg.ts`:
  - [ ] Mirror the Canvas drawing operations as SVG elements
  - [ ] Output a complete SVG string
- [ ] `renderRadixToSvg()` function
- [ ] Test: output is valid SVG (can be parsed as XML)
- [ ] Visual comparison: SVG output matches Canvas output

**Definition of done:** SVG export produces valid SVG matching the Canvas rendering.

---

### Task 15: Visual Test Harness + Polish
**Goal:** Complete visual test environment and final quality pass.

- [ ] Create `chart-renderer/test/visual/index.html`:
  - [ ] Renders a known chart
  - [ ] Theme toggle (dark / light)
  - [ ] Layer toggles (checkbox per layer)
  - [ ] Size slider (300-1200px)
  - [ ] House system dropdown (re-renders with different cusps)
  - [ ] Pre-loaded test charts: normal chart, stellium chart, all-retrograde chart
- [ ] Verify all rendering at each size
- [ ] Verify theme switching
- [ ] Run all tests: `npm test --workspace=packages/chart-renderer`
- [ ] Run type check: `npm run typecheck --workspaces`
- [ ] Visual inspection: compare rendered output against design reference

**Definition of done:** All tests pass. Visual harness demonstrates all features. Rendering matches design spec.

---

## Test Data

Use this chart data for development and testing (a real chart with interesting features):

```
Chart: "Test Stellium Chart"
Date: November 11, 1978, 07:00 UTC
Location: 56.8519°N, 60.6122°E (Ekaterinburg, Russia)
House System: Placidus
Zodiac: Tropical

This chart has:
- Scorpio stellium (Sun, Venus, Uranus) — tests collision avoidance
- Mercury and Mars in Sagittarius — tests adjacent sign placement
- Neptune in Sagittarius — additional testing
- Variety of aspects
- All major planet positions represented
```

Run this through the astro-api to generate the exact ChartData JSON, then hardcode it as test data in the chart-renderer package.

---

## Total Estimated Time: 3-4 weeks

Tasks 1-2: ~2 days (scaffolding + types)
Tasks 3-5: ~3 days (geometry + constants + glyphs)
Tasks 6-7: ~3 days (zodiac ring + houses)
Tasks 8-9: ~3 days (collision avoidance + planets)
Tasks 10-11: ~2 days (aspects + labels)
Tasks 12-13: ~3 days (main renderer + bi-wheel)
Tasks 14-15: ~2 days (SVG export + polish)
Buffer: ~3-4 days
