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
