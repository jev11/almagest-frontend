import { CelestialBody } from "@astro-app/shared-types";
import type { AspectType } from "@astro-app/shared-types";
import {
  longitudeToAngle,
  polarToCartesian,
  angularDistance,
} from "../core/geometry.js";
import {
  RING_PROPORTIONS,
  glyphSizes,
  MAJOR_ASPECTS,
  ASPECT_ANGLES,
} from "../core/constants.js";
import { PLANET_GLYPHS } from "../glyphs/planet-glyphs.js";
import { drawGlyphText } from "../glyphs/draw.js";
import { resolveCollisions, type GlyphPosition } from "../core/layout.js";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "../layers/types.js";

// Same body list as planet-ring, minus redundant nodes
const TRANSIT_BODIES: CelestialBody[] = [
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
  CelestialBody.MeanNorthNode,
  CelestialBody.TrueNorthNode,
  CelestialBody.MeanSouthNode,
  CelestialBody.TrueSouthNode,
  CelestialBody.Chiron,
];

// Maximum orb (degrees) for each major aspect type in inter-chart detection
const INTER_ASPECT_ORBS: Record<string, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 6,
  square: 6,
  sextile: 4,
};

function hexWithOpacity(hex: string, opacity: number): string {
  const base = hex.length > 7 ? hex.slice(0, 7) : hex;
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return base + alpha;
}

function orbToOpacity(orb: number): number {
  if (orb <= 1.0) return 0.85;
  if (orb <= 3.0) return 0.60;
  if (orb <= 5.0) return 0.40;
  return 0.25;
}

/**
 * Draw the outer (transit/synastry) planet ring in the annular zone
 * between the separator circle and the outer zodiac ring's inner edge.
 *
 * Transit planets are positioned using the inner natal chart's ascendant
 * so they share the same zodiac orientation.
 *
 * @param ctx            Canvas context
 * @param transitData    The transit or synastry chart data
 * @param innerAscendant Natal chart ascendant (degrees) — sets zodiac orientation
 * @param theme          Visual theme
 * @param outerDim       Full chart dimensions
 * @param separatorR     Radius of the separator ring (inner chart boundary)
 */
export function drawTransitRing(
  ctx: CanvasRenderingContext2D,
  transitData: ChartData,
  innerAscendant: number,
  theme: ChartTheme,
  outerDim: RenderDimensions,
  separatorR: number,
): void {
  const { cx, cy, radius } = outerDim;
  const zodiacInnerR = radius * RING_PROPORTIONS.zodiacInner;

  // Glyph center sits at the mid-point of the transit annular zone
  const transitMidR = (separatorR + zodiacInnerR) / 2;

  // Collect positions for all present transit bodies
  const glyphPositions: GlyphPosition[] = [];
  for (const body of TRANSIT_BODIES) {
    const position = transitData.positions[body];
    if (!position) continue;
    const angle = longitudeToAngle(position.longitude, innerAscendant);
    glyphPositions.push({
      body: body as string,
      originalAngle: angle,
      displayAngle: angle,
      displaced: false,
    });
  }

  const resolved = resolveCollisions(glyphPositions, transitMidR);
  const s = radius / 300;
  const fontSize = glyphSizes(radius).degreeLabel + 1;

  for (const pos of resolved) {
    const body = pos.body as CelestialBody;
    const zodiacPos = transitData.zodiac_positions[body];
    if (!zodiacPos) continue;

    const isRetrograde = zodiacPos.is_retrograde ?? false;
    // Transit planets rendered dimmer than natal to maintain visual hierarchy
    const color = isRetrograde ? theme.planetGlyphRetrograde : theme.degreeLabelColor;
    const planetChar = PLANET_GLYPHS[pos.body] ?? "";

    // Tick mark on the zodiac inner edge at the planet's true ecliptic position
    const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
    const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 5 * s);
    ctx.beginPath();
    ctx.moveTo(tickOuter.x, tickOuter.y);
    ctx.lineTo(tickInner.x, tickInner.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Planet glyph at the mid-radius of the transit zone
    const glyphPt = polarToCartesian(cx, cy, pos.displayAngle, transitMidR);
    drawGlyphText(ctx, planetChar, glyphPt.x, glyphPt.y, fontSize, color);

    // Retrograde indicator just inward from the glyph
    if (isRetrograde) {
      ctx.font = `${fontSize - 2}px ${theme.fontFamily}`;
      const retrogPt = polarToCartesian(
        cx,
        cy,
        pos.displayAngle,
        transitMidR - fontSize - 1,
      );
      ctx.fillText("℞", retrogPt.x, retrogPt.y);
    }

    // Arc leader line along the zodiac inner edge if the glyph was displaced
    if (pos.displaced) {
      const arcR = zodiacInnerR - 4 * s;
      const fromAngle = pos.originalAngle;
      const toAngle = pos.displayAngle;
      // Draw short arc along the inner edge of the zodiac ring
      const clockwise =
        ((toAngle - fromAngle + 2 * Math.PI) % (2 * Math.PI)) > Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -fromAngle, -toAngle, clockwise);
      ctx.strokeStyle = theme.leaderLineColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

/**
 * Draw aspect lines between inner (natal) and outer (transit/synastry) planets.
 * Lines connect both planets' angular positions on the inner chart's aspect circle.
 * Drawn as dashed lines to visually distinguish from natal-natal aspects.
 *
 * @param ctx       Canvas context
 * @param innerData Natal chart data
 * @param outerData Transit or synastry chart data
 * @param theme     Visual theme
 * @param innerDim  Inner chart dimensions (defines the aspect circle radius)
 */
export function drawInterChartAspects(
  ctx: CanvasRenderingContext2D,
  innerData: ChartData,
  outerData: ChartData,
  theme: ChartTheme,
  innerDim: RenderDimensions,
): void {
  const { cx, cy, radius } = innerDim;
  const aspectR = radius * RING_PROPORTIONS.aspectOuter;
  const innerAscendant = innerData.houses.ascendant;

  // Clip to the aspect circle so lines don't spill into house lines
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, aspectR, 0, Math.PI * 2);
  ctx.clip();

  for (const innerBody of TRANSIT_BODIES) {
    const innerPos = innerData.positions[innerBody];
    if (!innerPos) continue;

    for (const outerBody of TRANSIT_BODIES) {
      const outerPos = outerData.positions[outerBody];
      if (!outerPos) continue;

      const dist = angularDistance(innerPos.longitude, outerPos.longitude);

      // Find the tightest matching major aspect within its orb
      let matchedType: string | null = null;
      let matchedOrb = Infinity;

      for (const [aspectType, aspectAngle] of Object.entries(ASPECT_ANGLES)) {
        if (!MAJOR_ASPECTS.has(aspectType)) continue;
        const orb = Math.abs(dist - aspectAngle);
        const maxOrb = INTER_ASPECT_ORBS[aspectType] ?? 5;
        if (orb <= maxOrb && orb < matchedOrb) {
          matchedType = aspectType;
          matchedOrb = orb;
        }
      }

      if (matchedType === null) continue;

      const baseColor =
        theme.aspectColors[matchedType as AspectType] ?? "#888888";
      const color = hexWithOpacity(baseColor, orbToOpacity(matchedOrb));

      const angle1 = longitudeToAngle(innerPos.longitude, innerAscendant);
      const angle2 = longitudeToAngle(outerPos.longitude, innerAscendant);

      const pt1 = polarToCartesian(cx, cy, angle1, aspectR);
      const pt2 = polarToCartesian(cx, cy, angle2, aspectR);

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = theme.aspectMinorWidth;
      // Dashed to distinguish inter-chart aspects from natal-natal aspects
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}
