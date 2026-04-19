import { SIGN_ORDER, SIGN_ELEMENT } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes } from "../core/constants.js";
import { SIGN_GLYPHS } from "../glyphs/sign-glyphs.js";
import { drawGlyphText } from "../glyphs/draw.js";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

export function drawZodiacRing(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius, density } = dim;
  const ascendant = data.houses.ascendant;
  const outerR = radius * RING_PROPORTIONS.zodiacOuter;
  const innerR = radius * RING_PROPORTIONS.zodiacInner;

  // Draw 12 sign segments
  for (let i = 0; i < 12; i++) {
    const sign = SIGN_ORDER[i];
    if (!sign) continue;
    const element = SIGN_ELEMENT[sign];
    const startLon = i * 30;
    const endLon = (i + 1) * 30;

    // increasing longitude → increasing canvas angle (CCW on screen)
    // ctx.arc uses y-down convention, so negate angles and use anticlockwise=true for CCW
    const startAngle = longitudeToAngle(startLon, ascendant);
    const endAngle = longitudeToAngle(endLon, ascendant);

    // Draw ring slice: outer arc → line to inner → inner arc (reverse) → close
    // polarToCartesian uses math convention (y-up): angle → (cx+r·cos θ, cy-r·sin θ)
    // ctx.arc uses canvas convention (y-down): angle → (cx+r·cos θ, cy+r·sin θ)
    // To keep them consistent, negate angles passed to ctx.arc and flip anticlockwise flag.
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, -startAngle, -endAngle, true);
    const innerEnd = polarToCartesian(cx, cy, endAngle, innerR);
    ctx.lineTo(innerEnd.x, innerEnd.y);
    ctx.arc(cx, cy, innerR, -endAngle, -startAngle, false);
    ctx.closePath();

    // Fill with element color at low opacity
    const elementColor = theme.elementColors[element];
    ctx.save();
    ctx.globalAlpha = theme.elementBgOpacity;
    ctx.fillStyle = elementColor;
    ctx.fill();
    ctx.restore();

    // Divider line at the start of each sign
    const divOuter = polarToCartesian(cx, cy, startAngle, outerR);
    const divInner = polarToCartesian(cx, cy, startAngle, innerR);
    ctx.beginPath();
    ctx.moveTo(divOuter.x, divOuter.y);
    ctx.lineTo(divInner.x, divInner.y);
    ctx.strokeStyle = theme.signDividerStroke;
    ctx.lineWidth = theme.signDividerWidth * density.stroke;
    ctx.stroke();

    // Sign glyph centered in the segment
    const midLon = i * 30 + 15;
    const midAngle = longitudeToAngle(midLon, ascendant);
    const glyphR = (outerR + innerR) / 2;
    const glyphPos = polarToCartesian(cx, cy, midAngle, glyphR);
    const char = SIGN_GLYPHS[sign as string] ?? "";
    drawGlyphText(
      ctx,
      char,
      glyphPos.x,
      glyphPos.y,
      glyphSizes(radius).sign * density.glyphScale,
      theme.signGlyphColor,
    );
  }

  // Draw ring circle outlines
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = theme.ringStroke;
  ctx.lineWidth = theme.ringStrokeWidth * density.stroke;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = theme.ringStroke;
  ctx.lineWidth = theme.ringStrokeWidth * density.stroke;
  ctx.stroke();

  // Degree tick marks along the inner edge of the zodiac ring.
  // Tick length follows glyphScale (it's a visual size of the mark);
  // tick width follows stroke (it's a line weight). The `0.5` base on the
  // minor tick stays below the multiplier — a half-pixel line is intentional
  // subpixel hinting that stays crisp on sub-2× displays once multiplied.
  for (let deg = 0; deg < 360; deg++) {
    const angle = longitudeToAngle(deg, ascendant);
    let tickLen: number;
    let tickW: number;

    const ts = radius / 300;
    if (deg % 10 === 0) {
      tickLen = 6 * ts * density.glyphScale;
      tickW = 1 * density.stroke;
    } else if (deg % 5 === 0) {
      tickLen = 4 * ts * density.glyphScale;
      tickW = 1 * density.stroke;
    } else {
      tickLen = 2 * ts * density.glyphScale;
      tickW = 0.5 * density.stroke;
    }

    const outerPt = polarToCartesian(cx, cy, angle, innerR);
    const innerPt = polarToCartesian(cx, cy, angle, innerR - tickLen);
    ctx.beginPath();
    ctx.moveTo(outerPt.x, outerPt.y);
    ctx.lineTo(innerPt.x, innerPt.y);
    ctx.strokeStyle = theme.ringStroke;
    ctx.lineWidth = tickW;
    ctx.stroke();
  }
}
