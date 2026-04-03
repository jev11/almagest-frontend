# Phase 2: Chart Rendering Engine — Implementation Specification

## Goal

Build the chart-renderer package: a framework-agnostic, layer-based rendering engine that takes structured chart data and draws publication-quality astrological chart wheels on HTML Canvas 2D. The engine must support radix (single wheel) and bi-wheel (transit/synastry overlay) charts, with dark and light themes, and handle edge cases like planetary stelliums through collision avoidance.

## Prerequisites

- Phase 1 complete (almagest-backend running, natal endpoint returning ChartData)
- Design sprint complete (design system, chart wheel design, glyph set)
- almagest-frontend monorepo scaffolded with npm workspaces

## Deliverables (in order)

### 1. Monorepo Scaffolding

Set up the npm workspaces monorepo before building any packages.

**Root package.json:**
```json
{
  "name": "almagest-frontend",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vitest": "^2.0",
    "@vitest/coverage-v8": "^2.0"
  }
}
```

**tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

Each package extends this with:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### 2. shared-types Package

These types mirror the backend API contract. In production they'd be generated from the OpenAPI spec; for Phase 2, define them manually matching the API contract exactly.

```typescript
// packages/shared-types/src/enums.ts

export enum CelestialBody {
  Sun = "sun",
  Moon = "moon",
  Mercury = "mercury",
  Venus = "venus",
  Mars = "mars",
  Jupiter = "jupiter",
  Saturn = "saturn",
  Uranus = "uranus",
  Neptune = "neptune",
  Pluto = "pluto",
  NorthNode = "north_node",
  TrueNode = "true_node",
  SouthNode = "south_node",
  Chiron = "chiron",
  Lilith = "lilith",
  PartOfFortune = "part_of_fortune",
}

export enum ZodiacSign {
  Aries = "aries",
  Taurus = "taurus",
  Gemini = "gemini",
  Cancer = "cancer",
  Leo = "leo",
  Virgo = "virgo",
  Libra = "libra",
  Scorpio = "scorpio",
  Sagittarius = "sagittarius",
  Capricorn = "capricorn",
  Aquarius = "aquarius",
  Pisces = "pisces",
}

export enum HouseSystem {
  Placidus = "placidus",
  Koch = "koch",
  WholeSign = "whole_sign",
  Equal = "equal",
  Campanus = "campanus",
  Regiomontanus = "regiomontanus",
  Porphyry = "porphyry",
  Morinus = "morinus",
  Alcabitius = "alcabitius",
  Topocentric = "topocentric",
}

export enum AspectType {
  Conjunction = "conjunction",
  SemiSextile = "semi_sextile",
  Sextile = "sextile",
  Square = "square",
  Trine = "trine",
  Quincunx = "quincunx",
  Opposition = "opposition",
  SemiSquare = "semi_square",
  Sesquisquare = "sesquisquare",
  Quintile = "quintile",
  BiQuintile = "bi_quintile",
}

export enum ZodiacType {
  Tropical = "tropical",
  Sidereal = "sidereal",
}

export enum Element {
  Fire = "fire",
  Earth = "earth",
  Air = "air",
  Water = "water",
}
```

```typescript
// packages/shared-types/src/models.ts

import {
  CelestialBody, ZodiacSign, AspectType, HouseSystem, ZodiacType, Element
} from "./enums";

export interface CelestialPosition {
  longitude: number;       // 0-360 absolute ecliptic
  latitude: number;
  distance: number;
  speed_longitude: number; // negative = retrograde
  speed_latitude: number;
  speed_distance: number;
}

export interface ZodiacPosition {
  sign: ZodiacSign;
  degree: number;          // 0-29
  minute: number;          // 0-59
  second: number;          // 0-59
  is_retrograde: boolean;
  dignity: string | null;
}

export interface Aspect {
  body1: CelestialBody;
  body2: CelestialBody;
  type: AspectType;
  angle: number;
  orb: number;
  is_applying: boolean;
}

export interface HouseData {
  cusps: number[];         // 12 cusps in absolute longitude
  ascendant: number;
  midheaven: number;
  descendant: number;
  imum_coeli: number;
  vertex: number;
  east_point: number;
}

export interface ChartMetadata {
  house_system: HouseSystem;
  zodiac_type: ZodiacType;
  ayanamsa: string | null;
  ayanamsa_value: number | null;
  julian_day: number;
  delta_t: number;
  sidereal_time: number;
  obliquity: number;
}

/** The primary data structure consumed by the chart renderer. */
export interface ChartData {
  positions: Record<CelestialBody, CelestialPosition>;
  zodiac_positions: Record<CelestialBody, ZodiacPosition>;
  houses: HouseData;
  aspects: Aspect[];
  metadata: ChartMetadata;
}

/** Maps each zodiac sign to its element. */
export const SIGN_ELEMENT: Record<ZodiacSign, Element> = {
  [ZodiacSign.Aries]: Element.Fire,
  [ZodiacSign.Taurus]: Element.Earth,
  [ZodiacSign.Gemini]: Element.Air,
  [ZodiacSign.Cancer]: Element.Water,
  [ZodiacSign.Leo]: Element.Fire,
  [ZodiacSign.Virgo]: Element.Earth,
  [ZodiacSign.Libra]: Element.Air,
  [ZodiacSign.Scorpio]: Element.Water,
  [ZodiacSign.Sagittarius]: Element.Fire,
  [ZodiacSign.Capricorn]: Element.Earth,
  [ZodiacSign.Aquarius]: Element.Air,
  [ZodiacSign.Pisces]: Element.Water,
};

/** Sign order starting from Aries (index 0). */
export const SIGN_ORDER: ZodiacSign[] = [
  ZodiacSign.Aries, ZodiacSign.Taurus, ZodiacSign.Gemini,
  ZodiacSign.Cancer, ZodiacSign.Leo, ZodiacSign.Virgo,
  ZodiacSign.Libra, ZodiacSign.Scorpio, ZodiacSign.Sagittarius,
  ZodiacSign.Capricorn, ZodiacSign.Aquarius, ZodiacSign.Pisces,
];
```

### 3. Geometry Module (`chart-renderer/src/core/geometry.ts`)

All spatial math for the chart wheel. Pure functions, no side effects.

```typescript
/** Convert ecliptic longitude to angle on the chart wheel.
 *
 * The chart wheel is oriented with 0° Aries on the left (9 o'clock position)
 * and rotated so that the Ascendant sits on the left horizon.
 *
 * @param longitude - Ecliptic longitude (0-360°)
 * @param ascendant - Ascendant longitude for rotation
 * @returns Angle in radians, measured counter-clockwise from 3 o'clock
 */
export function longitudeToAngle(longitude: number, ascendant: number): number

/** Convert a chart angle + radius to canvas x,y coordinates.
 * @param cx - Center x of the wheel
 * @param cy - Center y of the wheel
 * @param angle - Angle in radians
 * @param radius - Distance from center
 */
export function polarToCartesian(cx: number, cy: number, angle: number, radius: number): { x: number; y: number }

/** Calculate the shortest angular distance between two longitudes.
 * Always returns a value between 0 and 180.
 */
export function angularDistance(lon1: number, lon2: number): number

/** Draw an arc path on a Canvas 2D context.
 * Used for zodiac sign segments and house cusp arcs.
 */
export function drawArc(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  radius: number,
  startAngle: number, endAngle: number,
  counterClockwise?: boolean,
): void

/** Normalize a longitude to 0-360 range. */
export function normalizeLongitude(lon: number): number

/** Get the sign index (0-11) from an absolute longitude. */
export function signIndexFromLongitude(lon: number): number
```

### 4. Constants Module (`chart-renderer/src/core/constants.ts`)

All fixed measurements and proportions.

```typescript
/** Ring proportions as fractions of total radius.
 * These define the wheel anatomy from outside to inside.
 *
 * For a 300px radius wheel:
 *   label ring:   270-300px  (outermost, planet degree labels)
 *   zodiac ring:  235-270px  (sign segments)
 *   planet ring:  210-235px  (planet glyphs)
 *   house zone:   0-210px    (house cusp lines)
 *   aspect zone:  0-180px    (aspect lines)
 */
export const RING_PROPORTIONS = {
  /** Outer edge of label ring (1.0 = full radius) */
  labelOuter: 1.0,
  /** Inner edge of label ring / outer edge of zodiac ring */
  zodiacOuter: 0.90,
  /** Inner edge of zodiac ring / outer edge of planet ring */
  zodiacInner: 0.783,
  /** Inner edge of planet ring / start of house zone */
  planetInner: 0.70,
  /** Inner edge of house cusp lines */
  houseInner: 0.15,
  /** Outer edge of aspect web zone */
  aspectOuter: 0.60,
} as const;

export const GLYPH_SIZES = {
  /** Planet glyph size in pixels (at 600px wheel diameter) */
  planet: 18,
  /** Zodiac sign glyph size */
  sign: 16,
  /** Degree label font size */
  degreeLabel: 11,
  /** House number font size */
  houseNumber: 13,
} as const;

export const COLLISION = {
  /** Minimum pixel gap between planet glyphs before collision avoidance activates */
  minGlyphGap: 20,
  /** Maximum displacement in pixels for collision resolution */
  maxDisplacement: 40,
  /** Number of iterations for force-directed layout */
  iterations: 50,
} as const;

/** Aspect angle definitions in degrees. */
export const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  semi_sextile: 30,
  sextile: 60,
  square: 90,
  trine: 120,
  quincunx: 150,
  opposition: 180,
  semi_square: 45,
  sesquisquare: 135,
  quintile: 72,
  bi_quintile: 144,
};

/** Major aspects (drawn with full weight). */
export const MAJOR_ASPECTS = new Set([
  "conjunction", "sextile", "square", "trine", "opposition",
]);
```

### 5. Theme System (`chart-renderer/src/themes/`)

```typescript
// themes/types.ts

import { Element, AspectType } from "@astro-app/shared-types";

export interface ChartTheme {
  name: string;

  /** Background color for the chart area */
  background: string;

  /** Ring and structural line colors */
  ringStroke: string;
  ringStrokeWidth: number;
  signDividerStroke: string;
  signDividerWidth: number;

  /** Zodiac sign segment background colors by element */
  elementColors: Record<Element, string>;
  /** Zodiac sign segment background opacity (0-1) */
  elementBgOpacity: number;

  /** Planet glyph color */
  planetGlyph: string;
  /** Planet glyph color when retrograde */
  planetGlyphRetrograde: string;

  /** House cusp line color */
  houseStroke: string;
  houseStrokeWidth: number;
  /** ASC/MC cusp line color (emphasized) */
  angleStroke: string;
  angleStrokeWidth: number;
  /** House number text color */
  houseNumberColor: string;

  /** Aspect line colors by type */
  aspectColors: Record<AspectType, string>;
  /** Aspect line width for major aspects */
  aspectMajorWidth: number;
  /** Aspect line width for minor aspects */
  aspectMinorWidth: number;
  /** Aspect line dash pattern for minor aspects [dash, gap] */
  aspectMinorDash: [number, number];

  /** Degree label text color */
  degreeLabelColor: string;
  /** Leader line color (connecting label to exact position) */
  leaderLineColor: string;

  /** Font family for all text */
  fontFamily: string;

  /** Outer ring planet label colors */
  signGlyphColor: string;
}
```

```typescript
// themes/dark.ts

import { Element, AspectType } from "@astro-app/shared-types";
import type { ChartTheme } from "./types";

export const darkTheme: ChartTheme = {
  name: "dark",

  background: "#0A0E17",

  ringStroke: "#2A3040",
  ringStrokeWidth: 1,
  signDividerStroke: "#2A3040",
  signDividerWidth: 1,

  elementColors: {
    [Element.Fire]: "#E85D4A",
    [Element.Earth]: "#5BA858",
    [Element.Air]: "#5B9FD4",
    [Element.Water]: "#7B6DB5",
  },
  elementBgOpacity: 0.08,

  planetGlyph: "#E8ECF1",
  planetGlyphRetrograde: "#F87171",

  houseStroke: "#2A3040",
  houseStrokeWidth: 1,
  angleStroke: "#6C8EEF",
  angleStrokeWidth: 2,
  houseNumberColor: "#565E6C",

  aspectColors: {
    [AspectType.Conjunction]: "#E8ECF1",
    [AspectType.SemiSextile]: "#565E6C",
    [AspectType.Sextile]: "#5B9FD4",
    [AspectType.Square]: "#E85D4A",
    [AspectType.Trine]: "#5BA858",
    [AspectType.Quincunx]: "#FBBF24",
    [AspectType.Opposition]: "#E85D4A",
    [AspectType.SemiSquare]: "#565E6C",
    [AspectType.Sesquisquare]: "#565E6C",
    [AspectType.Quintile]: "#565E6C",
    [AspectType.BiQuintile]: "#565E6C",
  },
  aspectMajorWidth: 1.5,
  aspectMinorWidth: 1,
  aspectMinorDash: [4, 4],

  degreeLabelColor: "#8892A4",
  leaderLineColor: "#2A3040",

  fontFamily: "Inter, system-ui, -apple-system, sans-serif",

  signGlyphColor: "#8892A4",
};
```

### 6. Glyph System (`chart-renderer/src/glyphs/`)

Glyphs are stored as SVG path data strings and rendered via Canvas `Path2D` API.

```typescript
// glyphs/planets.ts

/** SVG path data for each planet glyph.
 * All paths are designed on a 24x24 viewBox.
 * Origin is top-left (0,0), glyph centered in the 24x24 space.
 *
 * IMPORTANT: These are placeholder paths. Replace with actual designed
 * glyphs from the design sprint. Each path should be a single continuous
 * SVG path string that can be passed to `new Path2D(path)`.
 */
export const PLANET_GLYPHS: Record<string, string> = {
  // Sun — circle with dot center
  sun: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zm0 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",

  // Moon — crescent
  moon: "M12 2A10 10 0 0 0 12 22 7 7 0 0 1 12 2z",

  // ... (full glyph set to be designed and inserted)
  // Each glyph path will be replaced with the actual designed SVG path
  // data from the design sprint output.

  mercury: "",
  venus: "",
  mars: "",
  jupiter: "",
  saturn: "",
  uranus: "",
  neptune: "",
  pluto: "",
  north_node: "",
  south_node: "",
  chiron: "",
  lilith: "",
  part_of_fortune: "",
};

/** Draw a planet glyph on a Canvas 2D context.
 * @param ctx - Canvas 2D rendering context
 * @param glyph - SVG path string from PLANET_GLYPHS
 * @param x - Center x position
 * @param y - Center y position
 * @param size - Glyph size in pixels
 * @param color - Fill color
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number, y: number,
  size: number,
  color: string,
): void {
  if (!glyph) return; // Skip empty placeholder glyphs

  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24); // Scale from 24x24 viewBox to target size

  const path = new Path2D(glyph);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}
```

### 7. Layer System (`chart-renderer/src/layers/`)

Each layer is a pure function: `(ctx, chartData, theme, dimensions) → void`

```typescript
// layers/types.ts (internal to chart-renderer)

import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types";

export interface RenderDimensions {
  /** Center x of the wheel */
  cx: number;
  /** Center y of the wheel */
  cy: number;
  /** Total radius of the wheel */
  radius: number;
  /** Device pixel ratio for high-DPI rendering */
  dpr: number;
}

export type LayerFunction = (
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
) => void;
```

**Layer implementations:**

**`background.ts`** — Clears and fills the canvas background.

**`zodiac-ring.ts`** — Draws the 12 zodiac sign segments:
- For each sign: draw an arc segment with element-colored background at `elementBgOpacity`
- Draw sign divider lines at every 30°
- Draw sign glyphs centered in each segment
- Draw degree tick marks: tiny line every 1°, medium every 5°, larger every 10°
- The entire ring is rotated so the Ascendant sits at the left (9 o'clock position)

**`house-overlay.ts`** — Draws house cusp lines and numbers:
- Draw a line from `planetInner` radius to `houseInner` radius at each cusp longitude
- ASC (cusp 1) and MC (cusp 10) lines are thicker and use `angleStroke` color
- Draw house numbers centered between each pair of cusps
- House numbers positioned at ~50% of the house cusp zone radius

**`planet-ring.ts`** — Draws planet glyphs at their positions:
- For each planet: calculate its angle from longitude + ascendant rotation
- Position the glyph at the `planetRing` radius
- Run collision avoidance if glyphs overlap (see layout.ts)
- Draw leader lines from displaced glyphs to their exact position on the zodiac ring
- Retrograde planets use `planetGlyphRetrograde` color

**`aspect-web.ts`** — Draws aspect lines between planets:
- For each aspect: draw a line from body1's position to body2's position
- Lines drawn within the `aspectOuter` radius zone
- Line color determined by aspect type from theme
- Line opacity mapped to orb tightness:
  - 0-1° orb: 1.0 opacity
  - 1-3° orb: 0.7
  - 3-5° orb: 0.4
  - 5°+ orb: 0.2
- Major aspects use solid lines, minor aspects use dashed lines
- Optional: applying aspects slightly thicker than separating

**`degree-labels.ts`** — Draws degree/minute labels for each planet:
- Positioned in the outer label ring
- Format: `24°13'` (degree + minute)
- If retrograde, append `℞` symbol
- Use collision avoidance with planet glyphs (share the same layout pass)

### 8. Collision Avoidance (`chart-renderer/src/core/layout.ts`)

When multiple planets cluster in a narrow zodiac arc (stelliums), their glyphs and labels overlap. The layout module resolves this.

```typescript
export interface GlyphPosition {
  /** Celestial body identifier */
  body: string;
  /** Original angle (from longitude) */
  originalAngle: number;
  /** Display angle after collision avoidance */
  displayAngle: number;
  /** Whether this position was displaced */
  displaced: boolean;
}

/** Resolve overlapping glyph positions using a spring-force algorithm.
 *
 * Algorithm:
 * 1. Sort all positions by original angle
 * 2. Calculate pixel distance between adjacent glyphs at the planet ring radius
 * 3. If distance < minGlyphGap: apply repulsion force between overlapping pair
 * 4. Constrain displacement to maxDisplacement from original position
 * 5. Repeat for `iterations` steps
 * 6. Mark displaced positions (they'll need leader lines)
 *
 * @param positions - Array of glyph positions with original angles
 * @param radius - Radius of the planet ring (for pixel distance calculation)
 * @returns Updated positions with displayAngle set
 */
export function resolveCollisions(
  positions: GlyphPosition[],
  radius: number,
): GlyphPosition[]
```

### 9. Main Renderer (`chart-renderer/src/core/renderer.ts`)

Orchestrates all layers and provides the public API.

```typescript
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types";
import type { RenderDimensions } from "../layers/types";

export interface RenderOptions {
  /** Chart data from the API */
  data: ChartData;
  /** Visual theme */
  theme: ChartTheme;
  /** Canvas element to render on */
  canvas: HTMLCanvasElement;
  /** Which layers to render (default: all) */
  layers?: {
    background?: boolean;
    zodiacRing?: boolean;
    houseOverlay?: boolean;
    planetRing?: boolean;
    aspectWeb?: boolean;
    degreeLabels?: boolean;
  };
  /** Padding around the wheel in pixels */
  padding?: number;
}

/** Render a natal chart wheel on the given canvas.
 *
 * Steps:
 * 1. Calculate dimensions from canvas size and padding
 * 2. Set up high-DPI rendering (multiply by devicePixelRatio)
 * 3. Call each enabled layer function in order
 * 4. Return the render dimensions for hit-testing
 */
export function renderRadix(options: RenderOptions): RenderDimensions

/** Render a bi-wheel (inner natal + outer transit/synastry).
 * The inner wheel is rendered at a reduced radius.
 * The outer ring shows the second chart's planet positions.
 */
export function renderBiwheel(
  options: RenderOptions & {
    outerData: ChartData;
  },
): RenderDimensions

/** Utility: re-render only the aspect layer (for interactive toggling). */
export function renderAspectLayer(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void
```

### 10. SVG Export Adapter (`chart-renderer/src/adapters/svg.ts`)

For static image export (PNG/PDF generation later). Implements the same drawing operations but outputs SVG DOM instead of Canvas commands.

```typescript
/** Render a chart to an SVG string.
 * Same inputs as renderRadix, but returns an SVG string instead of drawing on canvas.
 */
export function renderRadixToSvg(
  data: ChartData,
  theme: ChartTheme,
  width: number,
  height: number,
): string
```

### 11. Test Harness

The chart renderer needs a visual test harness — a simple HTML page that renders charts with test data.

```typescript
// Create a test harness at packages/chart-renderer/test/visual/index.html
// This page:
// 1. Imports the renderer
// 2. Uses hardcoded ChartData (a known natal chart)
// 3. Renders the chart on a canvas
// 4. Provides controls to: switch theme, toggle layers, resize

// Test data: use a chart with known interesting features:
// - At least one stellium (3+ planets in one sign) to test collision avoidance
// - A retrograde planet to test retrograde rendering
// - Variety of aspects to test the aspect web
// - Born at a location where Placidus houses work well (mid-latitudes)
```

### 12. Tests

```typescript
// core/geometry.test.ts
describe("longitudeToAngle", () => {
  it("places Ascendant at 9 o'clock (π radians)", () => { });
  it("places Descendant at 3 o'clock (0 radians)", () => { });
  it("wraps correctly around 360°", () => { });
  it("handles negative ascendant values", () => { });
});

describe("polarToCartesian", () => {
  it("converts angle 0 to right side of circle", () => { });
  it("converts angle π/2 to top of circle", () => { });
  it("handles zero radius", () => { });
});

describe("angularDistance", () => {
  it("returns 0 for identical longitudes", () => { });
  it("returns 180 for opposition", () => { });
  it("handles wrap-around (350° and 10°)", () => { });
  it("always returns value between 0 and 180", () => { });
});

// core/layout.test.ts
describe("resolveCollisions", () => {
  it("does not modify well-spaced positions", () => { });
  it("separates two overlapping glyphs", () => { });
  it("handles stellium of 4 planets in 10°", () => { });
  it("marks displaced positions", () => { });
  it("constrains displacement to maxDisplacement", () => { });
  it("preserves original order after resolution", () => { });
});

// layers/ tests — verify each layer draws without errors
// Use a mock canvas context (e.g., jest-canvas-mock or manual mock)
describe("zodiacRingLayer", () => {
  it("draws 12 sign segments", () => { });
  it("rotates ring so ASC is at left", () => { });
});

describe("aspectWebLayer", () => {
  it("draws a line for each aspect", () => { });
  it("applies opacity based on orb", () => { });
  it("uses dashed lines for minor aspects", () => { });
});
```

## Acceptance Criteria

Phase 2 is complete when:

1. ✅ Monorepo builds cleanly (`npm run build --workspaces`)
2. ✅ `shared-types` package exports all types matching the API contract
3. ✅ `renderRadix()` draws a complete natal chart wheel on a Canvas element
4. ✅ All 6 layers render correctly: background, zodiac ring, houses, planets, aspects, labels
5. ✅ Dark and light themes produce visually distinct, correct output
6. ✅ Collision avoidance works for stelliums (4+ planets in 30°)
7. ✅ Retrograde planets are visually distinguished
8. ✅ Aspect line opacity correctly maps to orb tightness
9. ✅ ASC and MC cusp lines are visually emphasized
10. ✅ `renderBiwheel()` renders two concentric chart rings
11. ✅ SVG export adapter produces valid SVG matching canvas output
12. ✅ Visual test harness renders a known chart correctly
13. ✅ All unit tests pass (geometry, layout, layer smoke tests)
14. ✅ Planet and sign glyphs render at correct positions (verify against known chart)
15. ✅ Chart renders correctly at different sizes (300px to 1200px diameter)

---

## Decisions Log

Intentional deviations from the original spec, documented for future reference.

### D-001: Unicode glyphs instead of SVG Path2D

**Original spec:** Glyphs stored as SVG path data strings, rendered via Canvas `Path2D` API on a 24x24 viewBox.

**Implementation:** Unicode astrological symbols rendered via `ctx.fillText()`.

**Rationale:**
- Unicode symbols are natively supported across all browsers and operating systems without custom path data
- `Path2D` rendering of complex SVG paths has inconsistent anti-aliasing across browsers and DPR values
- Unicode glyphs scale perfectly with font size — no manual viewBox-to-pixel scaling needed
- Dramatically simpler code: a character lookup table vs. hundreds of lines of SVG path data
- Astrological Unicode symbols (U+2600–U+26FF, U+2648–U+2653) are well-established and render reliably
- Fallback is still possible by switching to `Path2D` later without changing the layer API

### D-002: Merged planet + degree label token system

**Original spec:** Planet glyphs on the planet ring (Layer 4), degree labels as a separate layer in the outermost label ring (Layer 6), each with independent collision avoidance.

**Implementation:** Planet glyphs and degree labels are rendered together in `planet-ring.ts` as a vertical stack of tokens (glyph, degree, sign glyph, minute, retrograde symbol) along a radial spoke. The separate `degree-labels.ts` layer is a no-op stub.

**Rationale:**
- A planet glyph and its degree label are semantically one unit — separating them across two rings with independent collision avoidance causes misalignment when either is displaced
- The token stack approach keeps all information about a planet visually grouped and readable
- Single collision avoidance pass for the entire label unit prevents glyph-label overlap that the two-layer approach struggled with
- Reduces total render passes and simplifies the layout algorithm
- Trade-off: the `degreeLabels` layer toggle in `RenderOptions` currently has no effect. This should be wired to hide degree tokens within the planet ring, or the toggle should be removed.

### D-003: Adjusted ring proportions

**Original spec:** `zodiacOuter: 0.90`, `aspectOuter: 0.60`, `elementBgOpacity: 0.08`

**Implementation:** `zodiacOuter: 0.95`, `aspectOuter: 0.38` (computed as `0.95 * 0.40`), `elementBgOpacity: 0.22`

**Rationale:**
- `zodiacOuter: 0.95` — The wider zodiac ring gives more room for sign glyphs (increased to 20px) and degree tick marks, improving readability especially at smaller wheel sizes
- `aspectOuter: 0.38` — A tighter aspect circle keeps aspect lines clearly inside the house zone without crossing house cusp lines or numbers. The spec's 0.60 caused aspect lines to overlap with house numbers at certain cusp angles
- `elementBgOpacity: 0.22` — The original 0.08 (8%) was nearly invisible on dark backgrounds, making it hard to distinguish which element a sign segment belongs to. 0.22 provides clear element identification while remaining subtle enough not to compete with foreground glyphs

### D-004: Tuned collision avoidance parameters

**Original spec:** `minGlyphGap: 20px`, `maxDisplacement: 40px`, `iterations: 50`

**Implementation:** `minGlyphGap: 15px`, `maxDisplacement: 70px`, `iterations: 80`

**Rationale:**
- Tested against real chart data including the Scorpio stellium test chart (Sun, Venus, Uranus within ~10°)
- `minGlyphGap: 15` — The merged token labels (glyph + degree + sign + minute) are narrower than the original spec assumed because they stack vertically rather than spreading horizontally. 15px is sufficient clearance
- `maxDisplacement: 70` — The original 40px cap was too restrictive for 4+ planet stelliums. With the merged token approach, displaced labels need more room to fan out along the ring
- `iterations: 80` — More iterations are needed for the spring-force algorithm to converge when resolving tight 4-5 planet clusters. 50 iterations left residual overlaps in edge cases

### D-005: Angle point labels in planet ring

**Original spec:** ASC/MC/DSC/IC marked only via emphasized cusp lines (thicker, accent color).

**Implementation:** Added text labels ("As", "Ds", "Mc", "Ic") positioned in the planet ring alongside planet glyphs, with a small angular offset (3° for MC/IC) to avoid cusp line overlap.

**Rationale:**
- Cusp line emphasis alone is insufficient for users to identify which angle is which, especially when multiple emphasized lines are visible
- Short text labels are standard in professional astrology software (Astro.com, Solar Fire)
- Angle labels participate in collision avoidance with planet glyphs, preventing overlap

### D-006: House cusp degree labels

**Original spec:** House overlay draws cusp lines and house numbers only.

**Implementation:** Added degree/sign labels at each cusp position on the outer edge of the zodiac ring, showing the exact cusp longitude (e.g., "15°♏32'").

**Rationale:**
- Professional astrology software universally displays cusp degrees — omitting them would make the chart unusable for serious work
- Positioned on the outer ring edge to avoid cluttering the house zone
- Uses a smaller font size to maintain visual hierarchy (cusp labels are secondary to planet labels)

### D-007: Additional CelestialBody enum members

**Original spec:** `NorthNode`, `TrueNode`, `SouthNode`

**Implementation:** `MeanNorthNode`, `TrueNorthNode`, `MeanSouthNode`, `TrueSouthNode`

**Rationale:**
- Astronomically, the lunar nodes have two calculation methods: mean (averaged) and true (oscillating). Professional astrology software distinguishes both
- The spec's `NorthNode` and `TrueNode` were ambiguous — did `NorthNode` mean mean or true? Having explicit mean/true variants eliminates confusion
- The backend API provides both variants, so the types should match

### D-008: Sign divider stroke color

**Original spec:** `#2A3040` (same as `border-subtle`)

**Implementation:** `#3D4860` (lighter)

**Rationale:**
- Sign dividers at `#2A3040` were nearly invisible against the element-colored backgrounds (especially at the higher 0.22 opacity). The lighter `#3D4860` ensures dividers remain visible while staying subtle
