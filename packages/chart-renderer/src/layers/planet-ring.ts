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

  // Draw planet labels RADIALLY — text on spokes, reading inward from zodiac ring
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
    const retro = zodiacPos.is_retrograde ? " ℞" : "";
    const restStr = ` ${deg} ${signGlyph} ${min}${retro}`;

    // Draw tick mark at true ecliptic position on zodiac inner edge
    const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
    const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 6);
    ctx.beginPath();
    ctx.moveTo(tickOuter.x, tickOuter.y);
    ctx.lineTo(tickInner.x, tickInner.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Anchor label at the zodiac inner ring edge — text extends inward toward center
    const anchorR = zodiacInnerR - 13;
    const labelPos = polarToCartesian(cx, cy, pos.displayAngle, anchorR);
    ctx.save();
    ctx.translate(labelPos.x, labelPos.y);

    // RADIAL rotation: text baseline lies along the radius (spoke).
    // ctx.rotate(α) rotates CW by α; text flows at math-angle -α.
    // Right half [0,π/2)∪(3π/2,2π]: text reads outward (α = -θ), right-side-up.
    //   Glyph closest to center, minutes closest to ring.
    // Left half [π/2, 3π/2]: text reads inward (α = -θ+π), right-side-up.
    //   Glyph closest to ring, minutes closest to center.
    const normalAngle = ((pos.displayAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const isRightHalf = normalAngle < Math.PI / 2 || normalAngle > 3 * Math.PI / 2;
    const rotation = isRightHalf
      ? -pos.displayAngle            // outward reading
      : -pos.displayAngle + Math.PI; // inward reading (flipped)
    ctx.rotate(rotation);

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    // Measure both parts: bold glyph + normal degree info
    const fontSize = GLYPH_SIZES.degreeLabel;
    ctx.font = `bold ${fontSize}px serif`;
    const glyphWidth = ctx.measureText(planetGlyph).width;
    ctx.font = `${fontSize}px serif`;
    const restWidth = ctx.measureText(restStr).width;
    const totalWidth = glyphWidth + restWidth;

    // Glyph must always be closest to the outer ring.
    // Right half: +x = outward, ring is at x=0. Reverse order so glyph is at ring end.
    // Left half: +x = inward, ring is at x=0. Normal order — glyph first at ring.
    if (isRightHalf) {
      const startX = -totalWidth;
      ctx.font = `${fontSize}px serif`;
      ctx.fillStyle = theme.degreeLabelColor;
      ctx.fillText(restStr, startX, 0);
      ctx.font = `bold ${fontSize}px serif`;
      ctx.fillStyle = color;
      ctx.fillText(planetGlyph, startX + restWidth, 0);
    } else {
      ctx.font = `bold ${fontSize}px serif`;
      ctx.fillStyle = color;
      ctx.fillText(planetGlyph, 0, 0);
      ctx.font = `${fontSize}px serif`;
      ctx.fillStyle = theme.degreeLabelColor;
      ctx.fillText(restStr, glyphWidth, 0);
    }

    ctx.restore();

    // Leader line from displaced label back to true position on zodiac inner edge
    if (pos.displaced) {
      const leaderFrom = polarToCartesian(cx, cy, pos.displayAngle, anchorR);
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
