import { MAJOR_ASPECTS } from "../core/constants.js";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes } from "../core/constants.js";
import type { ChartData } from "@astro-app/shared-types";
import type { AspectType } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";
import { ASPECT_GLYPHS } from "../glyphs/aspect-glyphs.js";
import { drawGlyphText } from "../glyphs/draw.js";

function hexWithOpacity(hex: string, opacity: number): string {
  const base = hex.length > 7 ? hex.slice(0, 7) : hex;
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return base + alpha;
}

function orbToOpacity(orb: number): number {
  if (orb <= 1.0) return 1.0;
  if (orb <= 3.0) return 0.7;
  if (orb <= 5.0) return 0.5;
  return 0.35;
}

export function drawAspectWeb(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius } = dim;
  const ascendant = data.houses.ascendant;
  const aspectR = radius * RING_PROPORTIONS.aspectOuter;

  // Fill the aspect circle with background — covers house/angle lines beneath
  ctx.beginPath();
  ctx.arc(cx, cy, aspectR, 0, Math.PI * 2);
  ctx.fillStyle = theme.background;
  ctx.fill();

  // Clip all drawing to stay within the aspect circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, aspectR, 0, Math.PI * 2);
  ctx.clip();

  for (const aspect of data.aspects) {
    if (aspect.type === "conjunction") continue;
    const pos1 = data.positions[aspect.body1];
    const pos2 = data.positions[aspect.body2];
    if (!pos1 || !pos2) continue;

    const angle1 = longitudeToAngle(pos1.longitude, ascendant);
    const angle2 = longitudeToAngle(pos2.longitude, ascendant);

    const pt1 = polarToCartesian(cx, cy, angle1, aspectR);
    const pt2 = polarToCartesian(cx, cy, angle2, aspectR);

    const isMajor = MAJOR_ASPECTS.has(aspect.type as string);
    const opacity = orbToOpacity(aspect.orb);
    const baseColor = theme.aspectColors[aspect.type as AspectType] ?? "#888888";
    const color = hexWithOpacity(baseColor, opacity);

    // Draw aspect line
    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = isMajor ? theme.aspectMajorWidth : theme.aspectMinorWidth;
    ctx.setLineDash(isMajor ? [] : theme.aspectMinorDash);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw aspect glyph at midpoint of the line
    const char = ASPECT_GLYPHS[aspect.type as string];
    if (char) {
      const mx = (pt1.x + pt2.x) / 2;
      const my = (pt1.y + pt2.y) / 2;

      const glyphSize = glyphSizes(radius).degreeLabel;
      const glyphHalf = Math.round(glyphSize * 0.65);
      ctx.save();
      // Small background behind glyph so it's readable over other lines
      ctx.fillStyle = theme.background;
      ctx.fillRect(mx - glyphHalf, my - glyphHalf, glyphHalf * 2, glyphHalf * 2);
      ctx.restore();
      drawGlyphText(ctx, char, mx, my, glyphSize, color);
    }
  }

  // Restore clip, then draw the circle outline on top
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, aspectR, 0, Math.PI * 2);
  ctx.strokeStyle = theme.ringStroke;
  ctx.lineWidth = theme.ringStrokeWidth;
  ctx.stroke();
}
