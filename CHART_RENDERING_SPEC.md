# Chart Wheel Rendering Specification

## Overview

This document specifies exactly how the chart wheel is drawn, layer by layer. Use this as the authoritative reference when implementing each layer in the chart-renderer package.

## Coordinate System

The chart wheel uses a polar coordinate system centered on the canvas:

```
Canvas origin (0,0) is top-left.
Wheel center: (cx, cy) = center of the canvas (accounting for padding).
Wheel radius: determined by the smaller of canvas width/height minus padding.

Angle convention:
  0 radians = 3 o'clock (canvas right)
  π/2 radians = 12 o'clock (canvas top) — NOTE: canvas y-axis is inverted
  π radians = 9 o'clock (canvas left)
  3π/2 radians = 6 o'clock (canvas bottom)

Zodiac direction: counter-clockwise (matching ecliptic direction)
  Aries (0°) → Taurus (30°) → Gemini (60°) → ... counter-clockwise
```

## Ascendant Rotation

The entire wheel is rotated so the **Ascendant sits at the 9 o'clock position** (left horizon). This is the standard Western astrology chart orientation.

```typescript
// Convert ecliptic longitude to canvas angle:
function longitudeToAngle(longitude: number, ascendant: number): number {
  // The Ascendant should map to π (9 o'clock, left side)
  // Degrees increase counter-clockwise
  const offset = ascendant; // Rotate so ASC = left
  const adjusted = longitude - offset;
  const radians = (adjusted * Math.PI) / 180;
  return Math.PI - radians; // Flip for counter-clockwise
}
```

Verify with known positions:
- Ascendant longitude → angle should place it at 9 o'clock (π radians)
- Descendant (ASC + 180°) → should be at 3 o'clock (0 radians)
- MC → should be roughly at 12 o'clock (varies by house system and latitude)

## Layer 1: Background

```
Operation: Clear entire canvas, then fill with theme.background color.

ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = theme.background;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

## Ring Proportions (Tuned)

> **Note:** These proportions were tuned during Phase 2 implementation against real chart data. They differ from the initial design estimates. See PHASE2_SPEC.md "Decisions Log" entries D-003 and D-004 for rationale.

```
ZODIAC_OUTER           = 0.95     (originally 0.90 — wider ring for readability)
ASPECT_CIRCLE_RATIO    = 0.40     (aspect circle as fraction of ZODIAC_OUTER)

RING_PROPORTIONS:
  labelOuter:          1.0        (unchanged)
  zodiacOuter:         0.95       (originally 0.90)
  zodiacInner:         0.783      (unchanged)
  planetInner:         0.70       (unchanged)
  houseNumberOuter:    0.45       (computed: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO + 0.07)
  houseInner:          0.15       (unchanged)
  aspectOuter:         0.38       (computed: ZODIAC_OUTER * ASPECT_CIRCLE_RATIO; originally 0.60)

For a 300px radius wheel:
  cusp labels:   285–300px   (outermost, small cusp degree text)
  zodiac ring:   235–285px   (sign segments, 0.783–0.95)
  planet ring:   210–235px   (planet glyphs + degree labels, 0.70–0.783)
  house zone:    0–210px     (house cusp lines + numbers)
  aspect zone:   0–114px     (aspect lines, 0.38 × 300)
```

## Layer 2: Zodiac Ring

The zodiac ring is the primary visual structure. It consists of 12 segments, one per sign.

### Sign Segments

For each of the 12 signs (i = 0 to 11):

```
Start longitude: i * 30 (0° for Aries, 30° for Taurus, etc.)
End longitude: (i + 1) * 30

Convert to canvas angles using longitudeToAngle + ascendant rotation.

Draw an arc segment:
  - Outer radius: radius * 0.95
  - Inner radius: radius * 0.783
  - Fill: theme.elementColors[signElement] at theme.elementBgOpacity (0.22 dark, 0.18 light)

The segment is a "ring slice" (not a pie slice):
  1. Arc from startAngle to endAngle at outer radius
  2. Line to inner radius at endAngle
  3. Arc from endAngle to startAngle at inner radius (reverse)
  4. Close path
```

### Sign Divider Lines

For each sign boundary (every 30°):
```
Draw a line from zodiacOuter to zodiacInner at the boundary angle.
Color: theme.signDividerStroke (#3D4860 dark, tuned for visibility against element backgrounds)
Width: theme.signDividerWidth
```

### Sign Glyphs

For each sign, draw the glyph centered in its segment:
```
Glyph angle: midpoint of sign segment (i * 30 + 15)
Glyph radius: midpoint of zodiac ring ((zodiacOuter + zodiacInner) / 2 * radius)
Size: GLYPH_SIZES.sign (20px — originally 16px, increased for readability)
Color: theme.signGlyphColor (#C4CAD6 dark)
Rendering: Unicode astrological symbols via ctx.fillText() (see Decisions Log D-001)
```

### Degree Tick Marks

Along the inner edge of the zodiac ring, draw tick marks:
```
Every 1°:  2px tick (barely visible, for precision reference)
Every 5°:  4px tick
Every 10°: 6px tick

Ticks extend inward from zodiacInner.
Color: theme.ringStroke
Width: 0.5px (1° ticks), 1px (5° and 10° ticks)
```

## Layer 3: House Overlay

### House Cusp Lines

For each of the 12 house cusps:
```
Convert cusp longitude to canvas angle.

Normal cusps (2, 3, 4, 5, 6, 8, 9, 11, 12):
  Draw line from planetInner * radius to houseInner * radius.
  Color: theme.houseStroke
  Width: theme.houseStrokeWidth

Angular cusps (1=ASC, 7=DSC, 10=MC, 4=IC):
  Draw line across full house zone.
  Color: theme.angleStroke
  Width: theme.angleStrokeWidth

ASC line (cusp 1): extends from zodiacOuter to center (full span)
MC line (cusp 10): extends from zodiacOuter to center (full span)
DSC/IC: same as ASC/MC but can be slightly thinner
```

### House Cusp Degree Labels

For each cusp, draw the exact longitude on the outer edge of the zodiac ring:
```
Format: "DD°♏MM'" (degree + sign glyph + minute)
Position: just outside zodiacOuter at the cusp angle
Font: theme.fontFamily, GLYPH_SIZES.degreeLabel
Color: theme.degreeLabelColor
Uses serif font for sign glyph inline rendering
```

### House Numbers

For each house (1-12):
```
Position: halfway between this cusp and the next cusp (angular midpoint)
Radius: houseInner * radius * 2.5 (roughly middle of the house zone)
         — adjust to avoid overlap with aspect lines

Text: house number ("1", "2", ... "12")
Font: theme.fontFamily, GLYPH_SIZES.houseNumber, regular weight
Color: theme.houseNumberColor
Alignment: centered both horizontally and vertically
```

## Layer 4: Planet Ring (with integrated degree labels)

> **Note:** The original design placed degree labels in a separate Layer 6. During implementation, planet glyphs and degree labels were merged into a single token-stack system for better visual grouping and collision avoidance. See PHASE2_SPEC.md Decisions Log D-002.

### Rendered Bodies

The planet ring renders these celestial bodies (in order):
```
Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn,
Uranus, Neptune, Pluto, MeanNorthNode, TrueNorthNode,
MeanSouthNode, TrueSouthNode, Chiron
```

Additionally, angle point labels (ASC, DSC, MC, IC) are rendered in the same ring with collision avoidance. See Decisions Log D-005.

### Position Calculation

For each planet in the chart data:
```
1. Get absolute longitude from chartData.positions[body].longitude
2. Convert to canvas angle: longitudeToAngle(longitude, ascendant)
3. Calculate position at planetRing radius:
   x, y = polarToCartesian(cx, cy, angle, (zodiacInner + planetInner) / 2 * radius)
```

### Token Stack System

Each planet is rendered as a vertical stack of tokens along a radial spoke:
```
Token stack (from zodiac ring inward):
  1. Planet glyph (Unicode symbol, bold, theme.planetGlyph color)
  2. Degree number (e.g. "24")
  3. Sign glyph (Unicode zodiac symbol)
  4. Minute number (e.g. "13")
  5. Retrograde symbol "℞" (if applicable, theme.planetGlyphRetrograde color)

Token step: fontSize + 1px between each token
Tokens are positioned along the radial line from the planet's angle
```

### Collision Avoidance

Before drawing, run all positions (planets + angle points) through `resolveCollisions()`:
```
1. Convert all positions to GlyphPosition objects with originalAngle
2. Call resolveCollisions(positions, planetRingRadius)
   - minGlyphGap: 15px (tuned for token stack width)
   - maxDisplacement: 70px
   - iterations: 80
3. Use displayAngle (not originalAngle) for token stack placement
4. For displaced items, draw a leader line from the displayed position
   to the exact position on the zodiac ring inner edge

Limitation: collision detection does not wrap around the 0°/360° boundary.
Two planets at ~359° and ~1° may not trigger separation.
```

### Drawing

For each planet:
```
If NOT displaced:
  Draw token stack at (x, y) on the planet ring

If displaced:
  Draw token stack at displaced (x, y)
  Draw a thin leader line (0.5px, theme.leaderLineColor) from glyph center
  to the exact zodiac ring inner edge at the original angle

Glyph color:
  Normal: theme.planetGlyph
  Retrograde: theme.planetGlyphRetrograde

Glyph size: GLYPH_SIZES.planet (18px)
Label size: GLYPH_SIZES.degreeLabel (11px)
```

## Layer 5: Aspect Web

### Aspect Lines

For each aspect in chartData.aspects:
```
1. Get longitude of body1 and body2
2. Convert both to canvas angles
3. Calculate positions at aspectOuter * radius (0.38, inside the house zone)
   Aspect lines are clipped to a circle at this radius

4. Determine opacity:
   orb = aspect.orb
   if orb <= 1.0: opacity = 1.0
   else if orb <= 3.0: opacity = 0.7
   else if orb <= 5.0: opacity = 0.4
   else: opacity = 0.2

5. Determine line style:
   if MAJOR_ASPECTS.has(aspect.type):
     width = theme.aspectMajorWidth (1.5px)
     dash = [] (solid)
   else:
     width = theme.aspectMinorWidth (1px)
     dash = theme.aspectMinorDash ([4, 4])

6. Draw:
   ctx.strokeStyle = theme.aspectColors[aspect.type] with opacity applied
   ctx.lineWidth = width
   ctx.setLineDash(dash)
   ctx.beginPath()
   ctx.moveTo(x1, y1)
   ctx.lineTo(x2, y2)
   ctx.stroke()
   ctx.setLineDash([]) // Reset dash
```

### Applying Opacity to Hex Colors

```typescript
function hexWithOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return hex + alpha;
}
// Example: hexWithOpacity("#E85D4A", 0.7) → "#E85D4AB3"
```

## Layer 6: Degree Labels (integrated into Layer 4)

> **Note:** Degree labels are now rendered as part of the planet ring token stack (Layer 4). The `degree-labels.ts` layer file exists as a no-op stub for API compatibility. The `degreeLabels` toggle in `RenderOptions.layers` currently has no effect.
>
> See PHASE2_SPEC.md Decisions Log D-002 for rationale.

Label format within the token stack:
```
Degree: "24" (from chartData.zodiac_positions[body].degree)
Sign:   Unicode zodiac glyph (from sign at that longitude)
Minute: "13" (from chartData.zodiac_positions[body].minute)
Retro:  "℞" appended if is_retrograde is true

Font: theme.fontFamily, GLYPH_SIZES.degreeLabel (11px)
Color: theme.degreeLabelColor
```

## High-DPI Rendering

All drawing must account for device pixel ratio:

```typescript
function setupHighDpi(canvas: HTMLCanvasElement, width: number, height: number): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
}
```

All coordinate calculations use the CSS pixel dimensions (width, height), not the canvas pixel dimensions (width * dpr, height * dpr). The `ctx.scale(dpr, dpr)` call handles the upscaling.

## Bi-Wheel Modifications

For a bi-wheel (transit/synastry overlay):

```
Inner chart (natal):
  Rendered at ~65% of total radius
  All ring proportions scaled proportionally
  Aspects drawn only for the inner chart

Outer ring (transits/partner):
  Occupies the space between inner chart edge and zodiac ring
  Only planet glyphs (no zodiac ring — shares the natal zodiac ring)
  Planet glyphs at ~80% of total radius
  
Inter-chart aspects:
  Lines from inner planet positions to outer planet positions
  Use a distinct line style (dotted, or different opacity)
  Color by aspect type (same palette)
```

## Responsive Behavior

> **Status:** Not yet implemented as of Phase 2 completion. This is a Phase 3 prerequisite (see below).

```
At 600px diameter (reference size):
  All glyph sizes and line widths as specified above.

At 300px diameter (minimum):
  Hide degree labels (too small to read)
  Reduce glyph sizes by 30%
  Hide degree tick marks (only keep 10° ticks)
  Reduce aspect line count (show only tight orb aspects, < 3°)

At 900px+ diameter:
  All elements visible
  Increase glyph sizes by 20%
  Show all tick marks

Scaling factor = diameter / 600
Apply to: glyph sizes, font sizes, line widths, tick mark lengths
Minimum clamp: never go below 8px for glyphs or 7px for text
```

---

## Phase 3 Prerequisites

The following items must be addressed before the chart renderer is integrated into the web application (Phase 3):

### 1. Responsive Scaling
The renderer currently draws at a fixed visual scale regardless of canvas size. Implement the responsive behavior defined above so charts are usable at mobile sizes (300px) and take advantage of large displays (900px+).

### 2. SVG Export Reconciliation
The SVG adapter (`adapters/svg.ts`) does not match the canvas output:
- SVG places degree labels in a separate outer ring; canvas uses the merged token stack system
- SVG does not render aspect glyph symbols at line midpoints
- SVG does not support bi-wheel export
- Font handling differs (hardcoded `serif` vs theme font)

Either update the SVG adapter to replicate the canvas drawing approach, or explicitly document it as a simplified/schematic export with different layout.

### 3. Font Family Consistency
Multiple layers and glyph renderers use hardcoded `serif` instead of `theme.fontFamily`. All text rendering must use the theme font. See BUG_REPORT.md BUG-001.

### 4. Degree Labels Layer Toggle
The `degreeLabels` toggle in `RenderOptions.layers` has no effect because labels are drawn inside `planet-ring.ts`. Either wire the toggle to suppress degree tokens within the planet ring, or remove it from the options interface.
