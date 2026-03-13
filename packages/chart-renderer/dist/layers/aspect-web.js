import { MAJOR_ASPECTS } from "../core/constants.js";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS } from "../core/constants.js";
function hexWithOpacity(hex, opacity) {
    // Handle both 6-char and 8-char hex colors
    const base = hex.length > 7 ? hex.slice(0, 7) : hex;
    const alpha = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, "0");
    return base + alpha;
}
function orbToOpacity(orb) {
    if (orb <= 1.0)
        return 1.0;
    if (orb <= 3.0)
        return 0.7;
    if (orb <= 5.0)
        return 0.4;
    return 0.2;
}
export function drawAspectWeb(ctx, data, theme, dim) {
    const { cx, cy, radius } = dim;
    const ascendant = data.houses.ascendant;
    const aspectR = radius * RING_PROPORTIONS.aspectOuter;
    for (const aspect of data.aspects) {
        const pos1 = data.positions[aspect.body1];
        const pos2 = data.positions[aspect.body2];
        if (!pos1 || !pos2)
            continue;
        const angle1 = longitudeToAngle(pos1.longitude, ascendant);
        const angle2 = longitudeToAngle(pos2.longitude, ascendant);
        const pt1 = polarToCartesian(cx, cy, angle1, aspectR);
        const pt2 = polarToCartesian(cx, cy, angle2, aspectR);
        const isMajor = MAJOR_ASPECTS.has(aspect.type);
        const opacity = orbToOpacity(aspect.orb);
        const baseColor = theme.aspectColors[aspect.type] ?? "#888888";
        const color = hexWithOpacity(baseColor, opacity);
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = isMajor ? theme.aspectMajorWidth : theme.aspectMinorWidth;
        if (isMajor) {
            ctx.setLineDash([]);
        }
        else {
            ctx.setLineDash(theme.aspectMinorDash);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
//# sourceMappingURL=aspect-web.js.map