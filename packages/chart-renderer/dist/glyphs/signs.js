/**
 * Zodiac sign glyph rendering using Unicode astrological symbols.
 * Rendered via ctx.fillText() — no SVG path data needed.
 */
export const SIGN_GLYPHS = {
    aries: "♈", // U+2648
    taurus: "♉", // U+2649
    gemini: "♊", // U+264A
    cancer: "♋", // U+264B
    leo: "♌", // U+264C
    virgo: "♍", // U+264D
    libra: "♎", // U+264E
    scorpio: "♏", // U+264F
    sagittarius: "♐", // U+2650
    capricorn: "♑", // U+2651
    aquarius: "♒", // U+2652
    pisces: "♓", // U+2653
};
/**
 * Draw a zodiac sign glyph on a Canvas 2D context using Unicode text.
 */
export function drawSignGlyph(ctx, glyph, x, y, size, color) {
    if (!glyph)
        return;
    ctx.save();
    ctx.font = `${size}px serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, x, y);
    ctx.restore();
}
//# sourceMappingURL=signs.js.map