import { CelestialBody } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
import { PLANET_GLYPHS } from "../glyphs/planets.js";
import { SIGN_ABBREVIATIONS } from "../glyphs/signs.js";
import { resolveCollisions, type GlyphPosition } from "../core/layout.js";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

// Bodies to render on the planet ring
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

export function drawPlanetRing(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius } = dim;
  const ascendant = data.houses.ascendant;

  const zodiacInnerR = radius * RING_PROPORTIONS.zodiacInner;
  const planetInnerR = radius * RING_PROPORTIONS.planetInner;
  const aspectCircleR = radius * RING_PROPORTIONS.aspectOuter;
  // Labels sit in the planet band; use planetRingR for collision spacing
  const planetRingR = (zodiacInnerR + planetInnerR) / 2;
  const labelR = (zodiacInnerR + aspectCircleR) / 2;

  // Build glyph positions for all present bodies
  const glyphPositions: GlyphPosition[] = [];

  for (const body of RENDERED_BODIES) {
    const position = data.positions[body];
    if (!position) continue;
    const angle = longitudeToAngle(position.longitude, ascendant);
    glyphPositions.push({
      body: body as string,
      originalAngle: angle,
      displayAngle: angle,
      displaced: false,
    });
  }

  // Resolve collisions
  const resolved = resolveCollisions(glyphPositions, planetRingR);

  // Draw planet labels tangentially following the circle curvature
  for (const pos of resolved) {
    const body = pos.body as CelestialBody;
    const zodiacPos = data.zodiac_positions[body];
    if (!zodiacPos) continue;

    const isRetrograde = zodiacPos.is_retrograde ?? false;
    const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;

    const planetGlyph = (PLANET_GLYPHS[pos.body] ?? "") + "\uFE0E";
    const deg = String(zodiacPos.degree).padStart(2, "0");
    const min = String(zodiacPos.minute).padStart(2, "0");
    const signAbbr = SIGN_ABBREVIATIONS[zodiacPos.sign] ?? "";
    const retro = zodiacPos.is_retrograde ? " ℞" : "";
    const restStr = ` ${deg} ${signAbbr} ${min}${retro}`;

    const labelPos = polarToCartesian(cx, cy, pos.displayAngle, labelR);
    ctx.save();
    ctx.translate(labelPos.x, labelPos.y);

    // Rotation: tangent to circle = angle - π/2.
    // Upper half [0, π] (DSC→MC→ASC): reads left-to-right facing outward.
    // Lower half (π, 2π] (ASC→IC→DSC): flip 180° so text is never upside-down.
    const normalAngle = ((pos.displayAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isUpperHalf = normalAngle <= Math.PI;
    const rotation = isUpperHalf
      ? pos.displayAngle - Math.PI / 2
      : pos.displayAngle + Math.PI / 2;
    ctx.rotate(rotation);

    ctx.font = `${GLYPH_SIZES.degreeLabel}px serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Measure for centering the full label at the planet's position
    const glyphWidth = ctx.measureText(planetGlyph).width;
    const totalWidth = ctx.measureText(planetGlyph + restStr).width;
    const startX = -totalWidth / 2;

    ctx.fillStyle = color;
    ctx.fillText(planetGlyph, startX, 0);
    ctx.fillStyle = theme.degreeLabelColor;
    ctx.fillText(restStr, startX + glyphWidth, 0);

    ctx.restore();

    // Tick mark at exact ecliptic position on zodiac inner edge
    if (pos.displaced) {
      const exactPos = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 4);
      const dispPos = polarToCartesian(cx, cy, pos.displayAngle, zodiacInnerR - 4);
      ctx.beginPath();
      ctx.moveTo(dispPos.x, dispPos.y);
      ctx.lineTo(exactPos.x, exactPos.y);
      ctx.strokeStyle = theme.leaderLineColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}
