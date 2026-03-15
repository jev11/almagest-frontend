import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

// Angular house indices (1-based): 1=ASC, 4=IC, 7=DSC, 10=MC
const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);

export function drawHouseOverlay(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius } = dim;
  const { houses } = data;
  const ascendant = houses.ascendant;

  const zodiacOuterR = radius * RING_PROPORTIONS.zodiacOuter;
  const planetInnerR = radius * RING_PROPORTIONS.planetInner;
  const aspectCircleR = radius * RING_PROPORTIONS.aspectOuter;

  // Draw house cusp lines
  for (let i = 0; i < 12; i++) {
    const houseNum = i + 1;
    const cuspLon = houses.cusps[i];
    if (cuspLon === undefined) continue;

    const angle = longitudeToAngle(cuspLon, ascendant);
    const isAngular = ANGULAR_HOUSES.has(houseNum);

    let outerR: number;
    let innerR: number;
    let strokeColor: string;
    let strokeWidth: number;

    if (isAngular) {
      outerR = zodiacOuterR;
      innerR = 0; // extends to center
      strokeColor = theme.angleStroke;
      strokeWidth = theme.angleStrokeWidth;
    } else {
      outerR = planetInnerR;
      innerR = aspectCircleR;
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

  // Position numbers midway between the aspect circle and the planet ring
  const numberR = (aspectCircleR + planetInnerR) / 2;

  for (let i = 0; i < 12; i++) {
    const cuspLon = houses.cusps[i];
    const nextCuspLon = houses.cusps[(i + 1) % 12];
    if (cuspLon === undefined || nextCuspLon === undefined) continue;

    // Angular midpoint between two cusps (accounting for wrap-around)
    let midLon: number;
    const diff = ((nextCuspLon - cuspLon) % 360 + 360) % 360;
    midLon = (cuspLon + diff / 2) % 360;

    const midAngle = longitudeToAngle(midLon, ascendant);
    const pos = polarToCartesian(cx, cy, midAngle, numberR);

    ctx.fillText(String(i + 1), pos.x, pos.y);
  }
}
