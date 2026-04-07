/**
 * Font family used for astrological glyph rendering.
 * Noto Sans Symbols covers planets, signs, nodes, and most aspects.
 * Noto Sans Symbols 2 covers Sun (☉), trine (△), square (□).
 */
export const GLYPH_FONT_FAMILY = "'Noto Sans Symbols 2', 'Noto Sans Symbols', sans-serif";

/**
 * Draw a Unicode glyph on a Canvas 2D context using fillText.
 * The glyph is centered on (x, y) at the requested pixel size.
 */
export function drawGlyphText(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  if (!char) return;
  ctx.save();
  ctx.font = `${size}px ${GLYPH_FONT_FAMILY}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // Center on the actual visual bounds of the glyph, not the font's em square.
  // textBaseline "middle" centers on the em midpoint which is uneven for many glyphs.
  const metrics = ctx.measureText(char);
  const verticalOffset = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.fillText(char, x, y + verticalOffset);
  ctx.restore();
}
