import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes } from "../core/constants.js";
import { SIGN_GLYPHS } from "../glyphs/signs.js";
import { SIGN_ORDER } from "@astro-app/shared-types";
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
  const houseNumberOuterR = radius * RING_PROPORTIONS.houseNumberOuter;
  const aspectCircleR = radius * RING_PROPORTIONS.aspectOuter;

  // Draw the house number ring circle (just outside the aspect circle)
  ctx.beginPath();
  ctx.arc(cx, cy, houseNumberOuterR, 0, 2 * Math.PI);
  ctx.strokeStyle = theme.ringStroke;
  ctx.lineWidth = theme.ringStrokeWidth;
  ctx.stroke();

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
      outerR = radius * RING_PROPORTIONS.zodiacInner;
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

    // Draw cusp divider tick on the house number ring
    const tickOuter = polarToCartesian(cx, cy, angle, houseNumberOuterR);
    const tickInner = polarToCartesian(cx, cy, angle, aspectCircleR);
    ctx.beginPath();
    ctx.moveTo(tickOuter.x, tickOuter.y);
    ctx.lineTo(tickInner.x, tickInner.y);
    ctx.strokeStyle = theme.houseStroke;
    ctx.lineWidth = theme.houseStrokeWidth;
    ctx.stroke();
  }



  // Draw house cusp labels outside the zodiac ring, tangent to the circle
  const cuspLabelR = zodiacOuterR + 10 * (radius / 300);

  for (let i = 0; i < 12; i++) {
    const cuspLon = houses.cusps[i];
    if (cuspLon === undefined) continue;

    const angle = longitudeToAngle(cuspLon, ascendant);
    const signIndex = Math.floor(((cuspLon % 360) + 360) % 360 / 30);
    const deg = String(Math.floor(((cuspLon % 360) + 360) % 360 % 30)).padStart(2, "0");
    const minute = String(Math.floor((((cuspLon % 360) + 360) % 360 % 1) * 60)).padStart(2, "0");
    const signKey = SIGN_ORDER[signIndex];
    const signGlyph = signKey ? (SIGN_GLYPHS[signKey] ?? "") : "";

    const labelStr = `${deg}${signGlyph}${minute}`;

    const pos = polarToCartesian(cx, cy, angle, cuspLabelR);
    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Rotate text tangent to the circle, always right-side-up.
    // CW tangent readable in upper half [0, π], flip in lower half.
    const normalAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isUpperHalf = normalAngle <= Math.PI;
    const baseRotation = -angle + Math.PI / 2;
    const rotation = isUpperHalf ? baseRotation : baseRotation + Math.PI;
    ctx.rotate(rotation);

    const sizes = glyphSizes(radius);
    ctx.font = `${sizes.degreeLabel}px serif`;
    ctx.fillStyle = theme.degreeLabelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelStr, 0, 0);

    ctx.restore();
  }

  // Draw house numbers centered in the ring between houseNumberOuterR and aspectCircleR
  ctx.font = `${glyphSizes(radius).houseNumber}px ${theme.fontFamily}`;
  ctx.fillStyle = theme.houseNumberColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const numberR = (houseNumberOuterR + aspectCircleR) / 2;

  for (let i = 0; i < 12; i++) {
    const cuspLon = houses.cusps[i];
    const nextCuspLon = houses.cusps[(i + 1) % 12];
    if (cuspLon === undefined || nextCuspLon === undefined) continue;

    // Angular midpoint between two cusps (accounting for wrap-around)
    const diff = ((nextCuspLon - cuspLon) % 360 + 360) % 360;
    const midLon = (cuspLon + diff / 2) % 360;

    const midAngle = longitudeToAngle(midLon, ascendant);
    const pos = polarToCartesian(cx, cy, midAngle, numberR);

    ctx.fillText(String(i + 1), pos.x, pos.y);
  }
}
