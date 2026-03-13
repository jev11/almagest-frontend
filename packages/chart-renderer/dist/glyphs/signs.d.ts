/**
 * Zodiac sign glyph rendering using Unicode astrological symbols.
 * Rendered via ctx.fillText() — no SVG path data needed.
 */
export declare const SIGN_GLYPHS: Record<string, string>;
/**
 * Draw a zodiac sign glyph on a Canvas 2D context using Unicode text.
 */
export declare function drawSignGlyph(ctx: CanvasRenderingContext2D, glyph: string, x: number, y: number, size: number, color: string): void;
//# sourceMappingURL=signs.d.ts.map