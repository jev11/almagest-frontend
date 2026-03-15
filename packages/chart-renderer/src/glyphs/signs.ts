/**
 * Zodiac sign glyph rendering using Unicode astrological symbols.
 * Rendered via ctx.fillText() — no SVG path data needed.
 */

export const SIGN_ABBREVIATIONS: Record<string, string> = {
  aries:       "Ar",
  taurus:      "Ta",
  gemini:      "Ge",
  cancer:      "Cn",
  leo:         "Le",
  virgo:       "Vi",
  libra:       "Li",
  scorpio:     "Sc",
  sagittarius: "Sg",
  capricorn:   "Cp",
  aquarius:    "Aq",
  pisces:      "Pi",
};

// \uFE0E (variation selector-15) forces text presentation, preventing emoji rendering
export const SIGN_GLYPHS: Record<string, string> = {
  aries:       "♈\uFE0E",  // U+2648
  taurus:      "♉\uFE0E",  // U+2649
  gemini:      "♊\uFE0E",  // U+264A
  cancer:      "♋\uFE0E",  // U+264B
  leo:         "♌\uFE0E",  // U+264C
  virgo:       "♍\uFE0E",  // U+264D
  libra:       "♎\uFE0E",  // U+264E
  scorpio:     "♏\uFE0E",  // U+264F
  sagittarius: "♐\uFE0E",  // U+2650
  capricorn:   "♑\uFE0E",  // U+2651
  aquarius:    "♒\uFE0E",  // U+2652
  pisces:      "♓\uFE0E",  // U+2653
};

/**
 * Draw a zodiac sign glyph on a Canvas 2D context using Unicode text.
 */
export function drawSignGlyph(
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
