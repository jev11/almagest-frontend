/**
 * Planet glyph rendering using Unicode astrological symbols.
 * These are standard Unicode code points — no SVG path data needed.
 * Rendered via ctx.fillText() which is reliable across all browsers.
 */
export declare const PLANET_GLYPHS: Record<string, string>;
/**
 * Draw a planet glyph on a Canvas 2D context using Unicode text.
 * @param ctx   - Canvas 2D rendering context
 * @param glyph - Unicode character from PLANET_GLYPHS
 * @param x     - Center x position
 * @param y     - Center y position
 * @param size  - Font size in pixels
 * @param color - Fill color
 */
export declare function drawGlyph(ctx: CanvasRenderingContext2D, glyph: string, x: number, y: number, size: number, color: string): void;
//# sourceMappingURL=planets.d.ts.map