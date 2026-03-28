import { CelestialBody } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
import { PLANET_GLYPHS } from "../glyphs/planets.js";
import { SIGN_GLYPHS } from "../glyphs/signs.js";
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

interface LabelToken {
  text: string;
  color: string;
  bold: boolean;
}

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
  const planetRingR = (zodiacInnerR + planetInnerR) / 2;

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

  // Resolve collisions using planetRingR for angular spacing
  const resolved = resolveCollisions(glyphPositions, planetRingR);

  const fontSize = GLYPH_SIZES.degreeLabel;
  const tokenStep = fontSize + 1; // vertical step between tokens along the radius

  // Draw planet labels: each character upright, placed along the radial spoke
  for (const pos of resolved) {
    const body = pos.body as CelestialBody;
    const zodiacPos = data.zodiac_positions[body];
    if (!zodiacPos) continue;

    const isRetrograde = zodiacPos.is_retrograde ?? false;
    const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;

    const planetGlyph = (PLANET_GLYPHS[pos.body] ?? "") + "\uFE0E";
    const deg = String(zodiacPos.degree).padStart(2, "0");
    const min = String(zodiacPos.minute).padStart(2, "0");
    const signGlyph = (SIGN_GLYPHS[zodiacPos.sign] ?? "");

    // Build token list: glyph (bold), degree, sign, minutes, (retrograde)
    const tokens: LabelToken[] = [
      { text: planetGlyph, color, bold: true },
      { text: deg, color: theme.degreeLabelColor, bold: false },
      { text: signGlyph, color: theme.degreeLabelColor, bold: false },
      { text: min, color: theme.degreeLabelColor, bold: false },
    ];
    if (isRetrograde) {
      tokens.push({ text: "℞", color, bold: false });
    }

    // Draw tick mark at true ecliptic position on zodiac inner edge
    const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
    const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 6);
    ctx.beginPath();
    ctx.moveTo(tickOuter.x, tickOuter.y);
    ctx.lineTo(tickInner.x, tickInner.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Place each token along the radial spoke, stepping inward from the zodiac ring.
    // Each character stays upright (no rotation) — just positioned at successive
    // points along the radius from ring toward center.
    let currentR = zodiacInnerR - 13; // start just inside the zodiac ring
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const token of tokens) {
      ctx.font = token.bold ? `bold ${fontSize}px serif` : `${fontSize}px serif`;
      ctx.fillStyle = token.color;
      const p = polarToCartesian(cx, cy, pos.displayAngle, currentR);
      ctx.fillText(token.text, p.x, p.y);
      currentR -= tokenStep;
    }

    // Leader line from displaced label back to true position on zodiac inner edge
    if (pos.displaced) {
      const leaderFrom = polarToCartesian(cx, cy, pos.displayAngle, zodiacInnerR - 13);
      const leaderTo = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 4);
      ctx.beginPath();
      ctx.moveTo(leaderFrom.x, leaderFrom.y);
      ctx.lineTo(leaderTo.x, leaderTo.y);
      ctx.strokeStyle = theme.leaderLineColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}
