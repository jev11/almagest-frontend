/**
 * Planet glyph rendering using Unicode astrological symbols.
 * These are standard Unicode code points — no SVG path data needed.
 * Rendered via ctx.fillText() which is reliable across all browsers.
 */

export const PLANET_GLYPHS: Record<string, string> = {
  sun:            "☉",  // U+2609
  moon:           "☽",  // U+263D
  mercury:        "☿",  // U+263F
  venus:          "♀",  // U+2640
  mars:           "♂",  // U+2642
  jupiter:        "♃",  // U+2643
  saturn:         "♄",  // U+2644
  uranus:         "♅",  // U+2645
  neptune:        "♆",  // U+2646
  pluto:          "♇",  // U+2647
  north_node:     "☊",  // U+260A
  true_node:      "☊",  // U+260A
  south_node:     "☋",  // U+260B
  chiron:         "⚷",  // U+26B7
  lilith:         "⚸",  // U+26B8
  part_of_fortune:"⊕",  // U+2295
};

/**
 * Draw a planet glyph on a Canvas 2D context using Unicode text.
 * @param ctx   - Canvas 2D rendering context
 * @param glyph - Unicode character from PLANET_GLYPHS
 * @param x     - Center x position
 * @param y     - Center y position
 * @param size  - Font size in pixels
 * @param color - Fill color
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  if (!glyph) return;
  ctx.save();
  ctx.font = `${size}px serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x, y);
  ctx.restore();
}
