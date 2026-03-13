import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
// Angular house indices (1-based): 1=ASC, 4=IC, 7=DSC, 10=MC
const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);
export function drawHouseOverlay(ctx, data, theme, dim) {
    const { cx, cy, radius } = dim;
    const { houses } = data;
    const ascendant = houses.ascendant;
    const zodiacOuterR = radius * RING_PROPORTIONS.zodiacOuter;
    const planetInnerR = radius * RING_PROPORTIONS.planetInner;
    const houseInnerR = radius * RING_PROPORTIONS.houseInner;
    // Draw house cusp lines
    for (let i = 0; i < 12; i++) {
        const houseNum = i + 1;
        const cuspLon = houses.cusps[i];
        if (cuspLon === undefined)
            continue;
        const angle = longitudeToAngle(cuspLon, ascendant);
        const isAngular = ANGULAR_HOUSES.has(houseNum);
        let outerR;
        let innerR;
        let strokeColor;
        let strokeWidth;
        if (isAngular) {
            outerR = zodiacOuterR;
            innerR = 0; // extends to center
            strokeColor = theme.angleStroke;
            strokeWidth = theme.angleStrokeWidth;
        }
        else {
            outerR = planetInnerR;
            innerR = houseInnerR;
            strokeColor = theme.houseStroke;
            strokeWidth = theme.houseStrokeWidth;
        }
        const pt1 = polarToCartesian(cx, cy, angle, outerR);
        const pt2 = polarToCartesian(cx, cy, angle, innerR);
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
    // Draw house numbers
    ctx.font = `${GLYPH_SIZES.houseNumber}px ${theme.fontFamily}`;
    ctx.fillStyle = theme.houseNumberColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Position numbers at roughly the midpoint of the house zone radius
    const numberR = (houseInnerR + planetInnerR) * radius * 0.5;
    for (let i = 0; i < 12; i++) {
        const cuspLon = houses.cusps[i];
        const nextCuspLon = houses.cusps[(i + 1) % 12];
        if (cuspLon === undefined || nextCuspLon === undefined)
            continue;
        // Angular midpoint between two cusps (accounting for wrap-around)
        let midLon;
        const diff = ((nextCuspLon - cuspLon) % 360 + 360) % 360;
        midLon = (cuspLon + diff / 2) % 360;
        const midAngle = longitudeToAngle(midLon, ascendant);
        const pos = polarToCartesian(cx, cy, midAngle, numberR);
        ctx.fillText(String(i + 1), pos.x, pos.y);
    }
}
//# sourceMappingURL=house-overlay.js.map