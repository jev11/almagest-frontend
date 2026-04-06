# Custom SVG Path Glyphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Unicode astrological glyphs with custom SVG path data rendered via `Path2D` for pixel-identical cross-browser rendering.

**Architecture:** SVG path strings on a 100×100 design grid, stored as TypeScript constants. A shared `drawPathGlyph()` function creates `Path2D` objects and renders them via `ctx.fill()`. Four layer files are migrated from `fillText()` to path-based rendering. Degree numbers, house numbers, and axis labels remain as `fillText()`.

**Tech Stack:** TypeScript, Canvas 2D `Path2D` API, Vitest

**Spec:** `docs/superpowers/specs/2026-04-06-custom-svg-glyphs-design.md`

---

## File Structure

```
packages/chart-renderer/src/glyphs/
├── draw.ts            # NEW — drawPathGlyph() function
├── planet-paths.ts    # NEW — PLANET_PATHS + PLANET_WIDTHS
├── sign-paths.ts      # NEW — SIGN_PATHS + SIGN_WIDTHS
├── aspect-paths.ts    # NEW — ASPECT_PATHS + ASPECT_WIDTHS
├── index.ts           # MODIFY — re-export new modules instead of old ones
├── glyphs.test.ts     # MODIFY — test path validity, key coverage, width bounds
├── planets.ts         # DELETE after migration
└── signs.ts           # DELETE after migration

packages/chart-renderer/src/layers/
├── zodiac-ring.ts     # MODIFY — use drawPathGlyph + SIGN_PATHS
├── planet-ring.ts     # MODIFY — dual-mode token rendering (path + text)
├── house-overlay.ts   # MODIFY — path rendering for sign glyph tokens
└── aspect-web.ts      # MODIFY — use drawPathGlyph + ASPECT_PATHS
```

---

### Task 1: Create `drawPathGlyph()` function and tests

**Files:**
- Create: `packages/chart-renderer/src/glyphs/draw.ts`

- [ ] **Step 1: Create `draw.ts` with the `drawPathGlyph` function**

```typescript
// packages/chart-renderer/src/glyphs/draw.ts

/** Design grid size for all glyph SVG paths. */
export const GLYPH_GRID = 100;

/**
 * Draw an SVG-path glyph on a Canvas 2D context using Path2D.
 * The glyph is centered on (x, y) and scaled from the 100×100 design grid
 * to the requested pixel size.
 */
export function drawPathGlyph(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  if (!pathData) return;
  const scale = size / GLYPH_GRID;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(pathData));
  ctx.restore();
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/chart-renderer/src/glyphs/draw.ts
git commit -m "feat(chart-renderer): add drawPathGlyph function for SVG path rendering"
```

---

### Task 2: Create planet path data

**Files:**
- Create: `packages/chart-renderer/src/glyphs/planet-paths.ts`

- [ ] **Step 1: Create `planet-paths.ts` with all 16 planet SVG paths and width ratios**

The file exports `PLANET_PATHS: Record<string, string>` and `PLANET_WIDTHS: Record<string, number>`.

Keys must exactly match the `CelestialBody` enum values from `packages/shared-types/src/enums.ts`:
`sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`, `pluto`, `mean_north_node`, `true_north_node`, `mean_south_node`, `true_south_node`, `chiron`, `lilith`, `part_of_fortune`

Note: `mean_north_node` and `true_north_node` share the same path (ascending node symbol ☊). Same for `mean_south_node` and `true_south_node` (descending node symbol ☋).

All paths are designed on a 100×100 grid. Style: calligraphic with variable stroke width, traditional astrological manuscript feel.

```typescript
// packages/chart-renderer/src/glyphs/planet-paths.ts

/**
 * SVG path data for planet glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */

const NORTH_NODE_PATH = "M 50 15 C 30 15 15 30 15 50 C 15 70 30 85 50 85 C 70 85 85 70 85 50 C 85 30 70 15 50 15 Z M 15 20 L 15 15 L 20 15 M 80 15 L 85 15 L 85 20 M 50 85 L 50 95";

const SOUTH_NODE_PATH = "M 50 85 C 70 85 85 70 85 50 C 85 30 70 15 50 15 C 30 15 15 30 15 50 C 15 70 30 85 50 85 Z M 15 80 L 15 85 L 20 85 M 80 85 L 85 85 L 85 80 M 50 15 L 50 5";

export const PLANET_PATHS: Record<string, string> = {
  sun:             "M 50 8 C 26.8 8 8 26.8 8 50 C 8 73.2 26.8 92 50 92 C 73.2 92 92 73.2 92 50 C 92 26.8 73.2 8 50 8 Z M 50 18 C 67.7 18 82 32.3 82 50 C 82 67.7 67.7 82 50 82 C 32.3 82 18 67.7 18 50 C 18 32.3 32.3 18 50 18 Z M 50 38 C 43.4 38 38 43.4 38 50 C 38 56.6 43.4 62 50 62 C 56.6 62 62 56.6 62 50 C 62 43.4 56.6 38 50 38 Z",
  moon:            "M 65 12 C 50 20 40 35 40 52 C 40 69 50 84 65 90 C 45 88 30 72 30 52 C 30 32 45 16 65 12 Z",
  mercury:         "M 50 8 C 35 8 23 18 23 32 C 23 42 30 50 40 54 L 30 54 L 30 58 L 45 58 L 45 72 L 32 82 L 35 86 L 50 76 L 65 86 L 68 82 L 55 72 L 55 58 L 70 58 L 70 54 L 60 54 C 70 50 77 42 77 32 C 77 18 65 8 50 8 Z M 50 16 C 60 16 69 23 69 32 C 69 41 60 48 50 48 C 40 48 31 41 31 32 C 31 23 40 16 50 16 Z",
  venus:           "M 50 8 C 35 8 23 20 23 35 C 23 50 35 62 50 62 C 65 62 77 50 77 35 C 77 20 65 8 50 8 Z M 50 16 C 60.5 16 69 24.5 69 35 C 69 45.5 60.5 54 50 54 C 39.5 54 31 45.5 31 35 C 31 24.5 39.5 16 50 16 Z M 46 62 L 46 80 L 32 80 L 32 86 L 46 86 L 46 95 L 54 95 L 54 86 L 68 86 L 68 80 L 54 80 L 54 62 Z",
  mars:            "M 68 8 L 90 8 L 90 30 L 82 30 L 82 22 L 62 42 C 68 50 72 60 72 70 C 72 85 60 96 45 96 C 30 96 18 85 18 70 C 18 55 30 44 45 44 C 52 44 58 46 63 50 L 75 18 L 68 8 Z M 45 52 C 35 52 26 61 26 70 C 26 79 35 88 45 88 C 55 88 64 79 64 70 C 64 61 55 52 45 52 Z",
  jupiter:         "M 10 58 L 52 58 C 46 48 36 35 36 24 C 36 14 44 8 54 8 C 64 8 72 14 72 24 C 72 28 70 32 66 36 L 58 30 C 62 26 64 24 64 20 C 64 16 60 14 54 14 C 48 14 44 18 44 24 C 44 34 56 48 62 58 L 78 58 L 78 64 L 62 64 L 62 90 L 54 90 L 54 64 L 10 64 Z",
  saturn:          "M 58 8 L 58 14 L 52 14 C 48 14 44 18 44 24 L 44 42 C 52 38 60 36 68 40 C 76 44 80 54 76 64 C 72 74 62 80 52 78 C 46 76 42 72 40 66 L 44 50 C 44 50 46 62 50 68 C 54 74 62 76 68 72 C 74 68 76 60 72 54 C 68 48 60 44 52 48 L 36 54 L 36 24 C 36 14 40 8 48 8 Z M 26 8 L 70 8 L 70 14 L 26 14 Z",
  uranus:          "M 46 8 L 46 32 L 20 32 L 20 40 L 46 40 L 46 50 C 38 52 32 60 32 68 C 32 78 40 86 50 86 C 60 86 68 78 68 68 C 68 60 62 52 54 50 L 54 40 L 80 40 L 80 32 L 54 32 L 54 8 Z M 50 56 C 56.6 56 62 61.4 62 68 C 62 74.6 56.6 80 50 80 C 43.4 80 38 74.6 38 68 C 38 61.4 43.4 56 50 56 Z",
  neptune:         "M 46 92 L 54 92 L 54 62 C 62 58 70 50 74 40 L 80 44 L 84 38 L 72 30 C 68 20 60 12 50 8 C 40 12 32 20 28 30 L 16 38 L 20 44 L 26 40 C 30 50 38 58 46 62 Z M 50 16 C 58 20 64 28 66 38 C 62 48 56 54 50 56 C 44 54 38 48 34 38 C 36 28 42 20 50 16 Z",
  pluto:           "M 50 92 L 50 58 L 30 58 L 30 52 L 50 52 L 50 42 C 38 40 30 32 30 22 C 30 12 40 5 54 5 C 68 5 78 12 78 22 C 78 32 70 40 58 42 L 58 52 L 78 52 L 78 58 L 58 58 L 58 92 Z M 54 12 C 44 12 38 16 38 22 C 38 28 44 34 54 34 C 64 34 70 28 70 22 C 70 16 64 12 54 12 Z",
  mean_north_node: NORTH_NODE_PATH,
  true_north_node: NORTH_NODE_PATH,
  mean_south_node: SOUTH_NODE_PATH,
  true_south_node: SOUTH_NODE_PATH,
  chiron:          "M 50 8 L 50 50 M 30 30 L 70 30 M 50 50 C 50 65 38 80 25 90 M 50 50 C 50 65 62 80 75 90 M 50 50 C 55 50 60 45 60 40 C 60 35 55 30 50 30",
  lilith:          "M 50 8 C 65 8 78 20 78 36 C 78 52 65 64 50 64 C 35 64 22 52 22 36 C 22 20 35 8 50 8 Z M 50 64 L 50 92 M 35 78 L 65 78",
  part_of_fortune: "M 50 5 C 25.2 5 5 25.2 5 50 C 5 74.8 25.2 95 50 95 C 74.8 95 95 74.8 95 50 C 95 25.2 74.8 5 50 5 Z M 50 12 C 71 12 88 29 88 50 C 88 71 71 88 50 88 C 29 88 12 71 12 50 C 12 29 29 12 50 12 Z M 50 5 L 50 95 M 5 50 L 95 50",
};

export const PLANET_WIDTHS: Record<string, number> = {
  sun: 1.0,
  moon: 0.55,
  mercury: 0.7,
  venus: 0.7,
  mars: 0.9,
  jupiter: 0.85,
  saturn: 0.7,
  uranus: 0.8,
  neptune: 0.85,
  pluto: 0.65,
  mean_north_node: 0.85,
  true_north_node: 0.85,
  mean_south_node: 0.85,
  true_south_node: 0.85,
  chiron: 0.6,
  lilith: 0.7,
  part_of_fortune: 1.0,
};
```

Note: These SVG paths are initial drafts. They will be visually reviewed and refined in a later task using the browser companion. The important thing is that they are valid SVG path strings that render recognizable astrological symbols.

- [ ] **Step 2: Commit**

```bash
git add packages/chart-renderer/src/glyphs/planet-paths.ts
git commit -m "feat(chart-renderer): add SVG path data for planet glyphs"
```

---

### Task 3: Create sign path data

**Files:**
- Create: `packages/chart-renderer/src/glyphs/sign-paths.ts`

- [ ] **Step 1: Create `sign-paths.ts` with all 12 zodiac sign SVG paths and width ratios**

Keys must exactly match the `ZodiacSign` enum values from `packages/shared-types/src/enums.ts`:
`aries`, `taurus`, `gemini`, `cancer`, `leo`, `virgo`, `libra`, `scorpio`, `sagittarius`, `capricorn`, `aquarius`, `pisces`

```typescript
// packages/chart-renderer/src/glyphs/sign-paths.ts

/**
 * SVG path data for zodiac sign glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */
export const SIGN_PATHS: Record<string, string> = {
  aries:       "M 20 85 C 20 50 35 20 50 15 C 65 20 80 50 80 85 M 50 15 L 50 90",
  taurus:      "M 15 25 C 15 10 35 5 50 20 C 65 5 85 10 85 25 M 50 30 C 30 30 18 45 18 62 C 18 78 30 92 50 92 C 70 92 82 78 82 62 C 82 45 70 30 50 30 Z",
  gemini:      "M 20 12 L 80 12 M 20 88 L 80 88 M 35 12 L 35 88 M 65 12 L 65 88",
  cancer:      "M 80 35 C 80 20 65 10 50 10 C 30 10 15 25 15 35 C 15 42 20 48 28 48 C 36 48 42 42 42 35 C 42 28 36 22 28 22 M 20 65 C 20 80 35 90 50 90 C 70 90 85 75 85 65 C 85 58 80 52 72 52 C 64 52 58 58 58 65 C 58 72 64 78 72 78",
  leo:         "M 25 75 C 25 85 35 92 45 92 C 55 92 62 85 62 75 C 62 65 55 55 45 55 C 35 55 25 48 25 35 C 25 22 35 12 48 12 C 58 12 65 18 65 28 M 65 28 C 75 28 85 22 85 12 M 85 12 C 85 22 92 32 92 42",
  virgo:       "M 15 15 L 15 70 C 15 82 22 90 32 90 M 35 15 L 35 70 C 35 82 42 90 52 90 M 55 15 L 55 70 C 55 82 65 90 75 80 C 85 70 85 55 75 50 L 90 90",
  libra:       "M 10 70 L 90 70 M 50 70 L 50 45 C 35 45 22 38 22 28 C 22 18 35 10 50 10 C 65 10 78 18 78 28 C 78 38 65 45 50 45 M 10 80 C 10 85 30 92 50 92 C 70 92 90 85 90 80",
  scorpio:     "M 15 15 L 15 70 C 15 82 22 90 32 90 M 35 15 L 35 70 C 35 82 42 90 52 90 M 55 15 L 55 70 C 55 82 65 90 75 80 L 85 70 L 78 76 M 85 70 L 78 64",
  sagittarius: "M 15 85 L 85 15 M 85 15 L 60 15 M 85 15 L 85 40 M 30 55 L 55 80",
  capricorn:   "M 15 15 L 15 60 C 15 75 25 85 40 85 C 55 85 60 75 60 65 L 60 40 C 60 30 65 22 75 22 C 85 22 90 30 90 45 C 90 60 80 75 65 85",
  aquarius:    "M 8 35 L 22 20 L 36 35 L 50 20 L 64 35 L 78 20 L 92 35 M 8 60 L 22 45 L 36 60 L 50 45 L 64 60 L 78 45 L 92 60",
  pisces:      "M 25 10 C 15 10 10 25 10 50 C 10 75 15 90 25 90 M 75 10 C 85 10 90 25 90 50 C 90 75 85 90 75 90 M 5 50 L 95 50",
};

export const SIGN_WIDTHS: Record<string, number> = {
  aries: 0.75,
  taurus: 0.85,
  gemini: 0.75,
  cancer: 0.85,
  leo: 0.85,
  virgo: 0.9,
  libra: 1.0,
  scorpio: 0.9,
  sagittarius: 0.85,
  capricorn: 0.95,
  aquarius: 1.0,
  pisces: 1.0,
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/chart-renderer/src/glyphs/sign-paths.ts
git commit -m "feat(chart-renderer): add SVG path data for zodiac sign glyphs"
```

---

### Task 4: Create aspect path data

**Files:**
- Create: `packages/chart-renderer/src/glyphs/aspect-paths.ts`

- [ ] **Step 1: Create `aspect-paths.ts` with all 11 aspect SVG paths and width ratios**

Keys must exactly match the `AspectType` enum values from `packages/shared-types/src/enums.ts`:
`conjunction`, `semi_sextile`, `sextile`, `square`, `trine`, `quincunx`, `opposition`, `semi_square`, `sesquisquare`, `quintile`, `bi_quintile`

```typescript
// packages/chart-renderer/src/glyphs/aspect-paths.ts

/**
 * SVG path data for aspect glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */
export const ASPECT_PATHS: Record<string, string> = {
  conjunction:   "M 50 8 C 38 8 28 18 28 30 C 28 42 38 52 50 52 C 62 52 72 42 72 30 C 72 18 62 8 50 8 Z M 50 52 L 50 92",
  opposition:    "M 50 8 C 38 8 28 16 28 26 C 28 36 38 44 50 44 C 62 44 72 36 72 26 C 72 16 62 8 50 8 Z M 50 44 L 50 56 M 50 56 C 38 56 28 64 28 74 C 28 84 38 92 50 92 C 62 92 72 84 72 74 C 72 64 62 56 50 56 Z",
  trine:         "M 50 8 L 10 85 L 90 85 Z M 50 18 L 20 80 L 80 80 Z",
  square:        "M 15 15 L 85 15 L 85 85 L 15 85 Z M 22 22 L 78 22 L 78 78 L 22 78 Z",
  sextile:       "M 50 5 L 93 30 L 93 70 L 50 95 L 7 70 L 7 30 Z",
  quincunx:      "M 50 8 L 50 55 M 35 55 L 65 55 M 25 75 L 50 55 L 75 75",
  semi_sextile:  "M 50 45 L 50 92 M 35 45 L 65 45 M 50 8 C 62 8 72 18 72 30 C 72 38 65 45 50 45 C 35 45 28 38 28 30 C 28 18 38 8 50 8 Z",
  semi_square:   "M 15 85 L 85 85 L 85 15 M 15 85 L 85 15",
  sesquisquare:  "M 15 15 L 85 15 L 85 85 L 15 85 Z M 15 85 L 85 15 M 15 15 L 85 85",
  quintile:      "M 50 5 L 97 38 L 79 92 L 21 92 L 3 38 Z",
  bi_quintile:   "M 50 5 L 97 38 L 79 92 L 21 92 L 3 38 Z M 50 25 L 80 48 L 68 80 L 32 80 L 20 48 Z",
};

export const ASPECT_WIDTHS: Record<string, number> = {
  conjunction: 0.55,
  opposition: 0.55,
  trine: 1.0,
  square: 1.0,
  sextile: 1.0,
  quincunx: 0.6,
  semi_sextile: 0.55,
  semi_square: 0.85,
  sesquisquare: 1.0,
  quintile: 1.0,
  bi_quintile: 1.0,
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/chart-renderer/src/glyphs/aspect-paths.ts
git commit -m "feat(chart-renderer): add SVG path data for aspect glyphs"
```

---

### Task 5: Update `index.ts` re-exports

**Files:**
- Modify: `packages/chart-renderer/src/glyphs/index.ts`

- [ ] **Step 1: Replace the contents of `index.ts`**

Current content:
```typescript
export { PLANET_GLYPHS, drawGlyph } from "./planets.js";
export { SIGN_GLYPHS, drawSignGlyph } from "./signs.js";
```

Replace with:
```typescript
export { PLANET_PATHS, PLANET_WIDTHS } from "./planet-paths.js";
export { SIGN_PATHS, SIGN_WIDTHS } from "./sign-paths.js";
export { ASPECT_PATHS, ASPECT_WIDTHS } from "./aspect-paths.js";
export { drawPathGlyph, GLYPH_GRID } from "./draw.js";
```

- [ ] **Step 2: Commit**

```bash
git add packages/chart-renderer/src/glyphs/index.ts
git commit -m "refactor(chart-renderer): update glyph index to export path-based modules"
```

---

### Task 6: Update tests

**Files:**
- Modify: `packages/chart-renderer/src/glyphs/glyphs.test.ts`

- [ ] **Step 1: Replace the test file contents**

```typescript
import { describe, it, expect } from "vitest";
import { PLANET_PATHS, PLANET_WIDTHS } from "./planet-paths.js";
import { SIGN_PATHS, SIGN_WIDTHS } from "./sign-paths.js";
import { ASPECT_PATHS, ASPECT_WIDTHS } from "./aspect-paths.js";
import { CelestialBody, ZodiacSign, AspectType } from "@astro-app/shared-types";

function allEnumValues(enumObj: Record<string, string>): string[] {
  return Object.values(enumObj);
}

describe("PLANET_PATHS", () => {
  const bodies = allEnumValues(CelestialBody);

  it("has a path for every CelestialBody enum value", () => {
    for (const body of bodies) {
      expect(PLANET_PATHS).toHaveProperty(body);
      expect(PLANET_PATHS[body]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every CelestialBody enum value", () => {
    for (const body of bodies) {
      expect(PLANET_WIDTHS).toHaveProperty(body);
      expect(PLANET_WIDTHS[body]).toBeGreaterThanOrEqual(0.1);
      expect(PLANET_WIDTHS[body]).toBeLessThanOrEqual(1.0);
    }
  });

  it("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(PLANET_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for planet "${key}"`).not.toThrow();
    }
  });
});

describe("SIGN_PATHS", () => {
  const signs = allEnumValues(ZodiacSign);

  it("has a path for every ZodiacSign enum value", () => {
    for (const sign of signs) {
      expect(SIGN_PATHS).toHaveProperty(sign);
      expect(SIGN_PATHS[sign]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every ZodiacSign enum value", () => {
    for (const sign of signs) {
      expect(SIGN_WIDTHS).toHaveProperty(sign);
      expect(SIGN_WIDTHS[sign]).toBeGreaterThanOrEqual(0.1);
      expect(SIGN_WIDTHS[sign]).toBeLessThanOrEqual(1.0);
    }
  });

  it("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(SIGN_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for sign "${key}"`).not.toThrow();
    }
  });
});

describe("ASPECT_PATHS", () => {
  const aspects = allEnumValues(AspectType);

  it("has a path for every AspectType enum value", () => {
    for (const aspect of aspects) {
      expect(ASPECT_PATHS).toHaveProperty(aspect);
      expect(ASPECT_PATHS[aspect]!.length).toBeGreaterThan(0);
    }
  });

  it("has a width ratio for every AspectType enum value", () => {
    for (const aspect of aspects) {
      expect(ASPECT_WIDTHS).toHaveProperty(aspect);
      expect(ASPECT_WIDTHS[aspect]).toBeGreaterThanOrEqual(0.1);
      expect(ASPECT_WIDTHS[aspect]).toBeLessThanOrEqual(1.0);
    }
  });

  it("has parseable SVG path strings", () => {
    for (const [key, path] of Object.entries(ASPECT_PATHS)) {
      expect(() => new Path2D(path), `Invalid path for aspect "${key}"`).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
npm test --workspace=packages/chart-renderer -- --run src/glyphs/glyphs.test.ts
```

Expected: All tests pass. If `Path2D` is not available in the Vitest jsdom/node environment, the "parseable SVG path strings" tests may need to be skipped or use a polyfill. In that case, wrap those tests with:
```typescript
const hasPath2D = typeof globalThis.Path2D !== "undefined";
it.skipIf(!hasPath2D)("has parseable SVG path strings", () => { ... });
```

- [ ] **Step 3: Commit**

```bash
git add packages/chart-renderer/src/glyphs/glyphs.test.ts
git commit -m "test(chart-renderer): update glyph tests for SVG path data"
```

---

### Task 7: Migrate `zodiac-ring.ts`

**Files:**
- Modify: `packages/chart-renderer/src/layers/zodiac-ring.ts:1-4,67-77`

- [ ] **Step 1: Update imports**

Replace line 4:
```typescript
import { SIGN_GLYPHS, drawSignGlyph } from "../glyphs/signs.js";
```
With:
```typescript
import { SIGN_PATHS } from "../glyphs/sign-paths.js";
import { drawPathGlyph } from "../glyphs/draw.js";
```

- [ ] **Step 2: Update the glyph drawing call**

Replace lines 67–77:
```typescript
    // SIGN_GLYPHS is keyed by enum value strings (e.g. "aries")
    const glyphPath = SIGN_GLYPHS[sign as string] ?? "";
    drawSignGlyph(
      ctx,
      glyphPath,
      glyphPos.x,
      glyphPos.y,
      glyphSizes(radius).sign,
      theme.signGlyphColor,
      theme.fontFamily,
    );
```
With:
```typescript
    const pathData = SIGN_PATHS[sign as string] ?? "";
    drawPathGlyph(
      ctx,
      pathData,
      glyphPos.x,
      glyphPos.y,
      glyphSizes(radius).sign,
      theme.signGlyphColor,
    );
```

- [ ] **Step 3: Build to verify no type errors**

```bash
npm run build --workspace=packages/chart-renderer
```

Expected: Clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chart-renderer/src/layers/zodiac-ring.ts
git commit -m "refactor(chart-renderer): migrate zodiac-ring to SVG path glyphs"
```

---

### Task 8: Migrate `planet-ring.ts`

This is the most involved migration. The token rendering loop needs to support two modes: path glyphs and text.

**Files:**
- Modify: `packages/chart-renderer/src/layers/planet-ring.ts:1-9,38-46,48-57,219-256,276-285`

- [ ] **Step 1: Update imports**

Replace lines 4–5:
```typescript
import { PLANET_GLYPHS } from "../glyphs/planets.js";
import { SIGN_GLYPHS } from "../glyphs/signs.js";
```
With:
```typescript
import { PLANET_PATHS, PLANET_WIDTHS } from "../glyphs/planet-paths.js";
import { SIGN_PATHS, SIGN_WIDTHS } from "../glyphs/sign-paths.js";
import { drawPathGlyph } from "../glyphs/draw.js";
```

- [ ] **Step 2: Add `pathData` field to `LabelToken` interface**

Replace the `LabelToken` interface (lines 38–46):
```typescript
interface LabelToken {
  text: string;
  color: string;
  bold: boolean;
  small?: boolean;
  extraGapAfter?: boolean;
  /** Override font size (px). Falls back to fontSize or minuteFontSize based on small flag. */
  size?: number;
}
```
With:
```typescript
interface LabelToken {
  text: string;
  color: string;
  bold: boolean;
  small?: boolean;
  extraGapAfter?: boolean;
  /** Override font size (px). Falls back to fontSize or minuteFontSize based on small flag. */
  size?: number;
  /** SVG path data — if set, render as Path2D instead of fillText. */
  pathData?: string;
  /** Width ratio (0–1) for path glyphs. Layout width = size * widthRatio. */
  widthRatio?: number;
}
```

- [ ] **Step 3: Update `lonToSignParts` to return path data instead of Unicode glyph**

Replace the `lonToSignParts` function (lines 48–57):
```typescript
function lonToSignParts(lon: number): { deg: string; min: string; signGlyph: string; signKey: string | undefined } {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const deg = String(Math.floor(norm % 30)).padStart(2, "0");
  const min = String(Math.floor((norm % 1) * 60)).padStart(2, "0");
  const signKey = SIGN_ORDER[signIndex];
  const signGlyph = signKey ? (SIGN_GLYPHS[signKey] ?? "") : "";
  return { deg, min, signGlyph, signKey };
}
```
With:
```typescript
function lonToSignParts(lon: number): { deg: string; min: string; signPath: string; signWidthRatio: number; signKey: string | undefined } {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const deg = String(Math.floor(norm % 30)).padStart(2, "0");
  const min = String(Math.floor((norm % 1) * 60)).padStart(2, "0");
  const signKey = SIGN_ORDER[signIndex];
  const signPath = signKey ? (SIGN_PATHS[signKey] ?? "") : "";
  const signWidthRatio = signKey ? (SIGN_WIDTHS[signKey] ?? 1.0) : 1.0;
  return { deg, min, signPath, signWidthRatio, signKey };
}
```

- [ ] **Step 4: Update angle label token construction (lines 219–230)**

Replace:
```typescript
      const { deg, min, signGlyph, signKey } = lonToSignParts(anglePoint.lon);
      const element = signKey ? SIGN_ELEMENT[signKey as keyof typeof SIGN_ELEMENT] : undefined;
      const signColor = element ? (theme.elementColors[element as keyof typeof theme.elementColors] ?? theme.degreeLabelColor) : theme.degreeLabelColor;
      tickColor = theme.angleStroke;
      tokens = [
        { text: anglePoint.label, color: theme.angleStroke, bold: false, extraGapAfter: true, size: sizes.planet },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: signGlyph, color: signColor, bold: false },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
```
With:
```typescript
      const { deg, min, signPath, signWidthRatio, signKey } = lonToSignParts(anglePoint.lon);
      const element = signKey ? SIGN_ELEMENT[signKey as keyof typeof SIGN_ELEMENT] : undefined;
      const signColor = element ? (theme.elementColors[element as keyof typeof theme.elementColors] ?? theme.degreeLabelColor) : theme.degreeLabelColor;
      tickColor = theme.angleStroke;
      tokens = [
        { text: anglePoint.label, color: theme.angleStroke, bold: false, extraGapAfter: true, size: sizes.planet },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: "", color: signColor, bold: false, pathData: signPath, widthRatio: signWidthRatio },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
```

- [ ] **Step 5: Update planet label token construction (lines 231–256)**

Replace:
```typescript
      const isRetrograde = zodiacPos.is_retrograde ?? false;
      const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;
      const planetGlyph = (PLANET_GLYPHS[pos.body] ?? "") + "\uFE0E";
      const deg = String(zodiacPos.degree).padStart(2, "0");
      const min = String(zodiacPos.minute).padStart(2, "0");
      const signGlyph = (SIGN_GLYPHS[zodiacPos.sign] ?? "");
      const element = SIGN_ELEMENT[zodiacPos.sign];
      const signColor = element ? (theme.elementColors[element] ?? theme.degreeLabelColor) : theme.degreeLabelColor;

      tickColor = color;
      tokens = [
        { text: planetGlyph, color, bold: true, extraGapAfter: false, size: sizes.planet },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: signGlyph, color: signColor, bold: false },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
      if (isRetrograde) {
        tokens.push({ text: "℞", color, bold: false, small: true });
      }
```
With:
```typescript
      const isRetrograde = zodiacPos.is_retrograde ?? false;
      const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;
      const planetPath = PLANET_PATHS[pos.body] ?? "";
      const planetWidthRatio = PLANET_WIDTHS[pos.body] ?? 1.0;
      const deg = String(zodiacPos.degree).padStart(2, "0");
      const min = String(zodiacPos.minute).padStart(2, "0");
      const signPath = SIGN_PATHS[zodiacPos.sign] ?? "";
      const signWidthRatio = SIGN_WIDTHS[zodiacPos.sign] ?? 1.0;
      const element = SIGN_ELEMENT[zodiacPos.sign];
      const signColor = element ? (theme.elementColors[element] ?? theme.degreeLabelColor) : theme.degreeLabelColor;

      tickColor = color;
      tokens = [
        { text: "", color, bold: true, extraGapAfter: false, size: sizes.planet, pathData: planetPath, widthRatio: planetWidthRatio },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: "", color: signColor, bold: false, pathData: signPath, widthRatio: signWidthRatio },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
      if (isRetrograde) {
        tokens.push({ text: "℞", color, bold: false, small: true });
      }
```

- [ ] **Step 6: Update the token rendering loop (lines 278–285)**

Replace:
```typescript
    for (const token of tokens) {
      const size = token.size ?? (token.small ? minuteFontSize : fontSize);
      ctx.font = token.bold ? `bold ${size}px ${theme.fontFamily}` : `${size}px ${theme.fontFamily}`;
      ctx.fillStyle = token.color;
      const p = polarToCartesian(cx, cy, pos.displayAngle, currentR);
      ctx.fillText(token.text, p.x, p.y);
      currentR -= size + gap + (token.extraGapAfter ? Math.round(fontSize * 0.6) : 0);
    }
```
With:
```typescript
    for (const token of tokens) {
      const size = token.size ?? (token.small ? minuteFontSize : fontSize);
      const p = polarToCartesian(cx, cy, pos.displayAngle, currentR);
      if (token.pathData) {
        drawPathGlyph(ctx, token.pathData, p.x, p.y, size, token.color);
      } else {
        ctx.font = token.bold ? `bold ${size}px ${theme.fontFamily}` : `${size}px ${theme.fontFamily}`;
        ctx.fillStyle = token.color;
        ctx.fillText(token.text, p.x, p.y);
      }
      currentR -= size + gap + (token.extraGapAfter ? Math.round(fontSize * 0.6) : 0);
    }
```

- [ ] **Step 7: Build to verify no type errors**

```bash
npm run build --workspace=packages/chart-renderer
```

Expected: Clean build with no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/chart-renderer/src/layers/planet-ring.ts
git commit -m "refactor(chart-renderer): migrate planet-ring to SVG path glyphs"
```

---

### Task 9: Migrate `house-overlay.ts`

**Files:**
- Modify: `packages/chart-renderer/src/layers/house-overlay.ts:3,107-136`

- [ ] **Step 1: Update imports**

Replace line 3:
```typescript
import { SIGN_GLYPHS } from "../glyphs/signs.js";
```
With:
```typescript
import { SIGN_PATHS, SIGN_WIDTHS } from "../glyphs/sign-paths.js";
import { drawPathGlyph } from "../glyphs/draw.js";
```

- [ ] **Step 2: Update the cusp label token construction and rendering (lines 107–136)**

Replace:
```typescript
    const signGlyph = signKey ? (SIGN_GLYPHS[signKey] ?? "") : "";

    const houseNum = i + 1;
    const tokens = houseNum >= 7
      ? [
          { text: minute, size: minuteFontSize },
          { text: signGlyph, size: fontSize },
          { text: deg, size: fontSize },
        ]
      : [
          { text: deg, size: fontSize },
          { text: signGlyph, size: fontSize },
          { text: minute, size: minuteFontSize },
        ];

    const widths = tokens.map(t => {
      ctx.font = `${t.size}px ${theme.fontFamily}`;
      return ctx.measureText(t.text).width;
    });
    const total = widths.reduce((a, w) => a + w, 0) + tokenGap * (tokens.length - 1);

    let arcOffset = -total / 2;
    for (let t = 0; t < tokens.length; t++) {
      const w = widths[t]!;
      ctx.font = `${tokens[t]!.size}px ${theme.fontFamily}`;
      const p = polarToCartesian(cx, cy, angle + (arcOffset + w / 2) / cuspLabelR, cuspLabelR);
      ctx.fillText(tokens[t]!.text, p.x, p.y);
      arcOffset += w + tokenGap;
    }
```
With:
```typescript
    const signPath = signKey ? (SIGN_PATHS[signKey] ?? "") : "";
    const signWidthRatio = signKey ? (SIGN_WIDTHS[signKey] ?? 1.0) : 1.0;

    const houseNum = i + 1;

    const tokens: Array<{ text: string; size: number; pathData?: string; widthRatio?: number }> = houseNum >= 7
      ? [
          { text: minute, size: minuteFontSize },
          { text: "", size: fontSize, pathData: signPath, widthRatio: signWidthRatio },
          { text: deg, size: fontSize },
        ]
      : [
          { text: deg, size: fontSize },
          { text: "", size: fontSize, pathData: signPath, widthRatio: signWidthRatio },
          { text: minute, size: minuteFontSize },
        ];

    const widths = tokens.map(t => {
      if (t.pathData) {
        return t.size * (t.widthRatio ?? 1.0);
      }
      ctx.font = `${t.size}px ${theme.fontFamily}`;
      return ctx.measureText(t.text).width;
    });
    const total = widths.reduce((a, w) => a + w, 0) + tokenGap * (tokens.length - 1);

    let arcOffset = -total / 2;
    for (let t = 0; t < tokens.length; t++) {
      const w = widths[t]!;
      const tok = tokens[t]!;
      const p = polarToCartesian(cx, cy, angle + (arcOffset + w / 2) / cuspLabelR, cuspLabelR);
      if (tok.pathData) {
        drawPathGlyph(ctx, tok.pathData, p.x, p.y, tok.size, theme.degreeLabelColor);
      } else {
        ctx.font = `${tok.size}px ${theme.fontFamily}`;
        ctx.fillText(tok.text, p.x, p.y);
      }
      arcOffset += w + tokenGap;
    }
```

- [ ] **Step 3: Build to verify no type errors**

```bash
npm run build --workspace=packages/chart-renderer
```

Expected: Clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chart-renderer/src/layers/house-overlay.ts
git commit -m "refactor(chart-renderer): migrate house-overlay to SVG path glyphs"
```

---

### Task 10: Migrate `aspect-web.ts`

**Files:**
- Modify: `packages/chart-renderer/src/layers/aspect-web.ts:9-22,86-104`

- [ ] **Step 1: Update imports and replace `ASPECT_GLYPHS`**

Add import at top of file (after existing imports, before the `ASPECT_GLYPHS` constant):
```typescript
import { ASPECT_PATHS } from "../glyphs/aspect-paths.js";
import { drawPathGlyph } from "../glyphs/draw.js";
```

Delete the entire `ASPECT_GLYPHS` constant (lines 9–22):
```typescript
// \uFE0E = text presentation selector (prevents emoji rendering)
const ASPECT_GLYPHS: Record<string, string> = {
  conjunction:   "☌\uFE0E",
  opposition:    "☍\uFE0E",
  trine:         "△",
  square:        "□",
  sextile:       "⚹\uFE0E",
  quincunx:      "⚻\uFE0E",
  semi_sextile:  "⚺\uFE0E",
  semi_square:   "∠",
  sesquisquare:  "⚼\uFE0E",
  quintile:      "Q",
  bi_quintile:   "bQ",
};
```

- [ ] **Step 2: Update the glyph rendering at midpoint (lines 86–104)**

Replace:
```typescript
    const glyph = ASPECT_GLYPHS[aspect.type as string];
    if (glyph) {
      const mx = (pt1.x + pt2.x) / 2;
      const my = (pt1.y + pt2.y) / 2;

      const glyphFontSize = glyphSizes(radius).degreeLabel;
      const glyphHalf = Math.round(glyphFontSize * 0.65);
      ctx.save();
      ctx.font = `${glyphFontSize}px ${theme.fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Small background behind glyph so it's readable over other lines
      ctx.fillStyle = theme.background;
      ctx.fillRect(mx - glyphHalf, my - glyphHalf, glyphHalf * 2, glyphHalf * 2);
      ctx.fillStyle = color;
      ctx.fillText(glyph, mx, my);
      ctx.restore();
    }
```
With:
```typescript
    const pathData = ASPECT_PATHS[aspect.type as string];
    if (pathData) {
      const mx = (pt1.x + pt2.x) / 2;
      const my = (pt1.y + pt2.y) / 2;

      const glyphSize = glyphSizes(radius).degreeLabel;
      const glyphHalf = Math.round(glyphSize * 0.65);
      ctx.save();
      // Small background behind glyph so it's readable over other lines
      ctx.fillStyle = theme.background;
      ctx.fillRect(mx - glyphHalf, my - glyphHalf, glyphHalf * 2, glyphHalf * 2);
      ctx.restore();
      drawPathGlyph(ctx, pathData, mx, my, glyphSize, color);
    }
```

- [ ] **Step 3: Build to verify no type errors**

```bash
npm run build --workspace=packages/chart-renderer
```

Expected: Clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/chart-renderer/src/layers/aspect-web.ts
git commit -m "refactor(chart-renderer): migrate aspect-web to SVG path glyphs"
```

---

### Task 11: Delete old Unicode glyph files

**Files:**
- Delete: `packages/chart-renderer/src/glyphs/planets.ts`
- Delete: `packages/chart-renderer/src/glyphs/signs.ts`

- [ ] **Step 1: Verify no remaining imports of old files**

```bash
cd packages/chart-renderer && grep -r "from.*glyphs/planets" src/ && grep -r "from.*glyphs/signs" src/
```

Expected: No matches (all imports were updated in Tasks 7–10).

- [ ] **Step 2: Delete the old files**

```bash
rm packages/chart-renderer/src/glyphs/planets.ts
rm packages/chart-renderer/src/glyphs/signs.ts
```

- [ ] **Step 3: Build and run tests to verify everything still works**

```bash
npm run build --workspace=packages/chart-renderer && npm test --workspace=packages/chart-renderer
```

Expected: Clean build, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -u packages/chart-renderer/src/glyphs/planets.ts packages/chart-renderer/src/glyphs/signs.ts
git commit -m "refactor(chart-renderer): remove old Unicode glyph files"
```

---

### Task 12: Visual review and glyph refinement

**Files:**
- Potentially modify: `packages/chart-renderer/src/glyphs/planet-paths.ts`, `sign-paths.ts`, `aspect-paths.ts`

- [ ] **Step 1: Start the dev server**

```bash
npm run dev --workspace=apps/web
```

- [ ] **Step 2: Open the app in both Firefox and Chrome**

Navigate to a chart view (any saved chart, or create a new one). Compare the chart rendering side-by-side in both browsers.

- [ ] **Step 3: Verify cross-browser consistency**

The glyphs should render identically in both browsers since they're now Path2D-based, not font-dependent. Check:
- All 12 zodiac signs in the zodiac ring
- Planet glyphs in planet labels
- Sign glyphs in planet labels and cusp labels
- Aspect glyphs at midpoints of aspect lines
- Glyph sizes and spacing look correct

- [ ] **Step 4: Refine any glyph paths that don't look right**

If any glyph looks off (wrong proportions, missing detail, too thin/thick), update the SVG path string in the corresponding file. This is an iterative visual process — update path, refresh browser, repeat.

- [ ] **Step 5: Commit any refinements**

```bash
git add packages/chart-renderer/src/glyphs/
git commit -m "fix(chart-renderer): refine calligraphic glyph paths after visual review"
```
