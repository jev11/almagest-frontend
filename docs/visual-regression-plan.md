# Frontend Visual Regression Plan

This document defines the visual regression testing strategy for the `chart-renderer` package.

## Purpose

The chart-renderer is a Canvas 2D component. Numerical unit tests are insufficient — a
regression in a layer, glyph, theme token, or collision-avoidance algorithm may produce a
correct calculation but a broken visual. This plan defines the scenarios and criteria for
human and automated visual validation.

---

## 1. Test Harness

The visual test harness is at `packages/chart-renderer/test/visual/`. Run it with:

```bash
cd packages/chart-renderer
npx vite --port 5174 test/visual/index.html
```

Open `http://localhost:5174` in Chrome. The harness exposes:

- **Chart selector**: Stellium, Transit, All-Retrograde
- **Theme toggle**: Dark / Light
- **Size slider**: 200–800px
- **Mode toggle**: Radix / Biwheel
- **Layer checkboxes**: toggle individual render layers
- **SVG export**: download a vector snapshot for archiving

---

## 2. Reference Chart States

These 5 states must be visually verified after any change to `src/core/renderer.ts`,
any theme file, or any layer in `src/layers/`.

### State 1: Standard Radix — Dark Theme — 500px

Chart: **Stellium** (Nov 11 1978, Ekaterinburg)
Theme: Dark
Size: 500px

Expected:
- Background fills canvas: `#0B0F14` (dark.background token)
- Zodiac ring (78.3%–95% radius): 12 equal segments, element colours at 18% opacity
  - Fire signs (Aries, Leo, Sagittarius): `rgba(239,107,74,0.18)`
  - Earth signs (Taurus, Virgo, Capricorn): `rgba(107,191,106,0.18)`
  - Air signs (Gemini, Libra, Aquarius): `rgba(242,212,79,0.18)`
  - Water signs (Cancer, Scorpio, Pisces): `rgba(91,164,230,0.18)`
- Sign glyphs (Noto Sans Symbols 2): centred in each zodiac segment
- Planet ring (70%–78.3% radius): all 10 planets + nodes visible
- Scorpio stellium (Sun, Venus, Uranus ≈ 226°–229°): collision avoidance spreads them
  at ≥ 8° visual separation, displaced radially by 6% radius
- Ascendant at 9 o'clock (left horizon)
- House cusp lines visible in house zone (0%–70%)
- Aspect lines in aspect zone (< 38% radius), coloured by type with orb-based opacity
- No planet glyph overlaps with any other glyph

### State 2: Standard Radix — Light Theme — 500px

Same chart and size as State 1 but with `lightTheme`.

Expected:
- Background: `#FAFAF8` (light.background token)
- All text and glyphs readable against light background
- Aspect lines visible but not distracting
- Element colours remain at 18% opacity

### State 3: Stellium Collision Avoidance — 300px (Small Size)

Chart: **Stellium** (Scorpio stellium: 3+ planets within ~10°)
Theme: Dark
Size: 300px

Expected:
- All three Scorpio-cluster planets (Sun ~228°, Venus ~223°, Uranus ~227°) are spread
  radially so no glyph overlaps another
- Minimum visual separation ≥ 8° of arc between any two glyphs
- If radial offset is insufficient, planets displaced further without leaving the planet ring
- Glyph text remains fully within the planet ring boundaries

### State 4: Retrograde Indicators

Chart: **All-Retrograde** (transit chart with multiple retrograde planets)
Theme: Dark
Size: 500px

Expected:
- Every retrograde planet shows a `℞` (retrograde glyph) below or adjacent to its body glyph
- Direct planets show no retrograde indicator
- The `℞` is rendered in `theme.retrograde` colour, visually distinct from body glyphs
- At 300px minimum size, retrograde indicators are still readable (not clipped)

### State 5: Biwheel Transit Chart

Mode: **Biwheel** (inner natal + outer transit)
Chart: Stellium (inner) + Transit (outer)
Theme: Dark
Size: 600px

Expected:
- Inner wheel (natal) occupies radix ring proportions
- Outer ring carries transit positions as a second planet ring outside the zodiac ring
- Aspect lines connect inner and outer planets with reduced opacity for bi-aspect lines
- Both rings' glyphs are sized so they do not collide with each other across rings
- House cusps remain associated with the inner (natal) wheel

---

## 3. Breakpoint Visual Tests

For each reference state, verify at three canvas sizes:

| Size | Label     | Expected behaviour |
|------|-----------|-------------------|
| 800px | Desktop  | Full detail, large glyphs, all labels visible |
| 480px | Tablet   | Glyphs slightly smaller, cusp labels may hide short text |
| 240px | Mobile   | Minimal — glyphs readable, aspect lines present but thinner; no text overlap |

At 240px, the following are acceptable omissions:
- Cusp degree labels (small text may be hidden)
- House numbers (optional at small sizes)
- Retrograde indicator text (glyph only)

These should **not** be omitted at 240px:
- Planet glyphs
- Sign glyphs
- Aspect lines (reduced thickness acceptable)
- Ascendant line

---

## 4. Theme Token Compliance Checklist

Run this check for any commit touching `src/themes/` or CSS variables.

```
□ Background colour matches theme.background token (no hardcoded hex)
□ Planet glyph colour matches theme.planets.<body> or theme.text
□ Sign glyph colour matches theme.zodiac.text
□ Aspect line colours match theme.aspects.<type> tokens
□ Retrograde indicator uses theme.retrograde token
□ Orb-based opacity: exact (0 orb) = 1.0, widest = 0.3, linear between
□ No hardcoded #RRGGBB strings outside src/themes/
```

---

## 5. Aspect Line Visual Criteria

For each major aspect type, aspect lines must:

| Aspect | Colour token | Line style |
|--------|-------------|------------|
| Conjunction | `aspects.conjunction` | Solid |
| Opposition | `aspects.opposition` | Solid |
| Trine | `aspects.trine` | Solid |
| Square | `aspects.square` | Solid |
| Sextile | `aspects.sextile` | Dashed (4px, 4px gap) |
| Quincunx | `aspects.quincunx` | Dashed (2px, 4px gap) |
| Semi-sextile | `aspects.semiSextile` | Dotted |

Opacity must scale linearly with orb:
- orb = 0° → opacity 1.0 (exact)
- orb = max orb → opacity 0.3 (widest)

---

## 6. Regression Protocol

### After changes to `src/core/renderer.ts` or any layer file:

1. Open the visual harness.
2. Run through all 5 reference states × 2 themes = 10 screenshots.
3. Diff visually against archived screenshots in `docs/screenshots/`.
4. Export SVG snapshots for archival (`docs/screenshots/state-N-theme-size.svg`).
5. Document any intentional changes in `CHART_RENDERING_SPEC.md`.

### After changes to `src/themes/`:

1. Verify all 5 states in both Dark and Light themes.
2. Run the theme token compliance checklist above.
3. Confirm no hardcoded colours exist in the renderer source.

### After changes to collision avoidance (`src/layers/planets.ts`):

1. Run State 3 (Stellium at 300px) — verify no glyph overlap.
2. Run State 1 at all three sizes — verify reasonable spread.
3. Run State 5 (Biwheel) — verify inner/outer ring glyphs do not collide across rings.

---

## 7. Performance Benchmark

The chart renderer must draw within the following budgets:

| Canvas size | Budget |
|-------------|--------|
| 800px       | < 50ms |
| 480px       | < 30ms |
| 240px       | < 20ms |

Measure with:

```typescript
const t0 = performance.now();
renderRadix(ctx, chartData, { size, theme });
const elapsed = performance.now() - t0;
console.log(`Render time: ${elapsed.toFixed(1)}ms`);
```

The visual harness displays render time in the `chart-info` panel. Report regressions
exceeding 50% above baseline.

---

## 8. Screenshots Archive

Canonical screenshots are stored in `docs/screenshots/`. File naming convention:

```
state-{N}-{chart}-{theme}-{size}px.png
state-{N}-{chart}-{theme}-{size}px.svg   (SVG export from harness)
```

Example: `state-1-stellium-dark-500px.svg`

When visual regression is found, add a `before/` sub-directory for the old snapshot and
update the root file to the new expected state, with a commit message explaining the change.
