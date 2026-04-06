# Custom SVG Path Glyphs for Chart Renderer

**Date:** 2026-04-06
**Status:** Design approved
**Motivation:** Unicode astrological glyphs render differently across browsers (Firefox vs Chrome) due to font fallback, `measureText()` variance, and `textBaseline` inconsistencies. Replace them with custom SVG path data rendered via `Path2D` for pixel-identical output everywhere.

## Decisions

- **Style:** Classic / calligraphic — variable stroke width, traditional astrological manuscript feel
- **Design grid:** 100x100 unit square
- **Rendering:** `Path2D` objects filled via `ctx.fill()` — no fonts, no `fillText()` for astrological symbols
- **Scope:** All 39 astrological glyphs (16 planets, 12 zodiac signs, 11 aspects)
- **Architecture:** Approach A — inline SVG path string constants in TypeScript, no JSON atlas, no font files

## Glyph Inventory

### Planets (16)
sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, mean_north_node, true_north_node, mean_south_node, true_south_node, chiron, lilith, part_of_fortune

### Zodiac Signs (12)
aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces

### Aspects (11)
conjunction, opposition, trine, square, sextile, quincunx, semi_sextile, semi_square, sesquisquare, quintile, bi_quintile

## File Structure

All changes are within `packages/chart-renderer/src/glyphs/`:

```
glyphs/
├── planet-paths.ts    # PLANET_PATHS: Record<string, string>, PLANET_WIDTHS: Record<string, number>
├── sign-paths.ts      # SIGN_PATHS: Record<string, string>, SIGN_WIDTHS: Record<string, number>
├── aspect-paths.ts    # ASPECT_PATHS: Record<string, string>, ASPECT_WIDTHS: Record<string, number>
├── draw.ts            # drawPathGlyph() function
├── index.ts           # Re-exports
├── glyphs.test.ts     # Updated tests
├── planets.ts         # REMOVED (old Unicode glyphs)
└── signs.ts           # REMOVED (old Unicode glyphs)
```

## Glyph Data Format

Each path file exports a path map and a width ratio map:

```typescript
// planet-paths.ts
export const PLANET_PATHS: Record<string, string> = {
  sun: "M 50 10 C 72 10 90 28 90 50 ...",  // SVG path data, 100x100 grid
  moon: "M 65 15 C 45 15 30 30 30 50 ...",
  // ... all 16
};

export const PLANET_WIDTHS: Record<string, number> = {
  sun: 1.0,
  moon: 0.6,
  // ... ratio of visual width to height, 0.1–1.0
};
```

Keys match the existing keys used throughout the layer code (`pos.body`, `zodiacPos.sign`, aspect type strings).

## Drawing Function

```typescript
// draw.ts
export function drawPathGlyph(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const scale = size / 100;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(pathData));
  ctx.restore();
}
```

Centers glyph on (x, y). Scales from 100x100 design grid to target pixel size. No font parameters.

## Layer Migration

### zodiac-ring.ts
- Replace `drawSignGlyph(ctx, glyph, x, y, size, color, fontFamily)` with `drawPathGlyph(ctx, SIGN_PATHS[sign], x, y, size, color)`
- Remove `SIGN_GLYPHS` / `drawSignGlyph` imports, add `SIGN_PATHS` / `drawPathGlyph` imports

### planet-ring.ts
- Token array currently mixes Unicode glyph strings with degree/minute text
- Planet glyph and sign glyph tokens become path-rendered; degree numbers and retrograde symbol (℞) stay as `fillText()`
- Token rendering loop needs two modes: `"path"` tokens call `drawPathGlyph()`, `"text"` tokens call `fillText()`
- Width measurement for path tokens: `size * widthRatio` (from `PLANET_WIDTHS` / `SIGN_WIDTHS`)
- Width measurement for text tokens: `measureText()` (unchanged — these are ASCII characters that render consistently)

### house-overlay.ts
- Cusp label tokens: sign glyph tokens switch to path rendering
- Width for sign glyph tokens: `size * SIGN_WIDTHS[key]` instead of `measureText()`
- Degree/minute text tokens unchanged

### aspect-web.ts
- Replace `fillText(glyph, mx, my)` with `drawPathGlyph(ctx, ASPECT_PATHS[type], mx, my, size, color)`
- Background rect behind glyph unchanged
- Remove `ASPECT_GLYPHS` local constant, import `ASPECT_PATHS` instead

## What Stays as fillText()

- Degree numbers (00–29)
- Minute numbers (00–59)
- Retrograde symbol ℞
- House numbers (1–12)
- Chart info text (name, date, location)
- Axis labels (As, Ds, Mc, Ic)

These are standard ASCII/Latin characters that render consistently across browsers.

## Test Plan

Replace `glyphs/glyphs.test.ts`:

1. Every key in `PLANET_PATHS`, `SIGN_PATHS`, `ASPECT_PATHS` has a non-empty string value
2. Every key in path maps has a corresponding entry in the width map
3. Width ratios are between 0.1 and 1.0
4. Path strings are parseable by `new Path2D()` (no throw)
5. Key coverage: all keys used by layers exist in path maps (cross-reference with `CelestialBody` enum values, sign names, aspect type strings)
6. Visual review of all 39 glyphs via browser companion before merging

## Out of Scope

- Stroke-based rendering (outline glyphs) — fill only for now
- Glyph animation
- Multiple glyph sets / theme-switchable glyphs
- Custom font file generation
