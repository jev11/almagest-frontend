import { CelestialBody } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

const RENDERED_BODIES: CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
  CelestialBody.NorthNode,
  CelestialBody.Chiron,
];

export function drawDegreeLabels(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius } = dim;
  const ascendant = data.houses.ascendant;

  // Labels go in the label ring (between zodiacOuter and labelOuter)
  const labelR =
    radius * ((RING_PROPORTIONS.labelOuter + RING_PROPORTIONS.zodiacOuter) / 2);

  ctx.font = `${GLYPH_SIZES.degreeLabel}px ${theme.fontFamily}`;
  ctx.fillStyle = theme.degreeLabelColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const body of RENDERED_BODIES) {
    const zodiacPos = data.zodiac_positions[body];
    if (!zodiacPos) continue;

    const position = data.positions[body];
    if (!position) continue;

    const angle = longitudeToAngle(position.longitude, ascendant);
    const pos = polarToCartesian(cx, cy, angle, labelR);

    // Format label: "24°13'" or "24°13' ℞"
    const deg = String(zodiacPos.degree).padStart(2, "0");
    const min = String(zodiacPos.minute).padStart(2, "0");
    let label = `${deg}\u00b0${min}'`;
    if (zodiacPos.is_retrograde) {
      label += " \u211e";
    }

    // Rotate text to follow the radial direction
    ctx.save();
    ctx.translate(pos.x, pos.y);
    // Rotate so text reads radially; negate angle because canvas y-axis is inverted
    const textAngle = -angle + Math.PI / 2;
    ctx.rotate(textAngle);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}
