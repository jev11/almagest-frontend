import { CelestialBody, SIGN_ORDER, SIGN_ELEMENT } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes } from "../core/constants.js";
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
  CelestialBody.MeanNorthNode,
  CelestialBody.TrueNorthNode,
  CelestialBody.MeanSouthNode,
  CelestialBody.TrueSouthNode,
  CelestialBody.Chiron,
];

// Angle point identifiers (not celestial bodies)
const ANGLE_IDS = {
  asc: "__asc__",
  dsc: "__dsc__",
  mc: "__mc__",
  ic: "__ic__",
} as const;

interface LabelToken {
  text: string;
  color: string;
  bold: boolean;
  small?: boolean;
  extraGapAfter?: boolean;
  /** Override font size (px). Falls back to fontSize or minuteFontSize based on small flag. */
  size?: number;
}

/** Convert an ecliptic longitude to sign degree/minute/sign glyph */
function lonToSignParts(lon: number): { deg: string; min: string; signGlyph: string; signKey: string | undefined } {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const deg = String(Math.floor(norm % 30)).padStart(2, "0");
  const min = String(Math.floor((norm % 1) * 60)).padStart(2, "0");
  const signKey = SIGN_ORDER[signIndex];
  const signGlyph = signKey ? (SIGN_GLYPHS[signKey] ?? "") : "";
  return { deg, min, signGlyph, signKey };
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

  // Build glyph positions for all present bodies AND angle points
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

  // Add angle points (ASC, DSC, MC, IC) into the same pool
  // MC/IC get a small offset so labels don't sit on top of the angle line
  const anglePoints: Array<{ id: string; lon: number; label: string; labelOffset: number }> = [
    { id: ANGLE_IDS.asc, lon: data.houses.ascendant, label: "As", labelOffset: 0 },
    { id: ANGLE_IDS.dsc, lon: data.houses.descendant, label: "Ds", labelOffset: 0 },
    { id: ANGLE_IDS.mc, lon: data.houses.midheaven, label: "Mc", labelOffset: 0 },
    { id: ANGLE_IDS.ic, lon: data.houses.imum_coeli, label: "Ic", labelOffset: 0 },
  ];

  for (const ap of anglePoints) {
    const trueAngle = longitudeToAngle(ap.lon, ascendant);
    const labelAngle = longitudeToAngle(ap.lon + ap.labelOffset, ascendant);
    glyphPositions.push({
      body: ap.id,
      originalAngle: trueAngle,
      displayAngle: labelAngle,
      displaced: ap.labelOffset !== 0,
    });
  }

  // Resolve collisions for ALL labels together — sorted by degree
  const resolved = resolveCollisions(glyphPositions, planetRingR);

  // Nudge AS and DS slightly off the horizon axis so labels don't clash with the line.
  // A positive (CCW) offset pushes DS above the axis and AS below it.
  const axisOffsetRad = 14 / planetRingR;
  for (const pos of resolved) {
    if (pos.body === ANGLE_IDS.asc || pos.body === ANGLE_IDS.dsc) {
      pos.displayAngle += axisOffsetRad;
      pos.displaced = false;
    }
  }

  const sizes = glyphSizes(radius);
  const fontSize = sizes.degreeLabel;
  const minuteFontSize = Math.round(fontSize * 0.70);
  const gap = Math.max(1.5, Math.round(radius / 300));

  // Draw all labels: each character upright, placed along the radial spoke
  for (const pos of resolved) {
    // Determine if this is an angle point or a planet
    const anglePoint = anglePoints.find((ap) => ap.id === pos.body);
    let tokens: LabelToken[];
    let tickColor: string;

    if (anglePoint) {
      // Angle label: As/Ds/Mc/Ic + degree + sign + minutes
      const { deg, min, signGlyph, signKey } = lonToSignParts(anglePoint.lon);
      const element = signKey ? SIGN_ELEMENT[signKey as keyof typeof SIGN_ELEMENT] : undefined;
      const signColor = element ? (theme.elementColors[element as keyof typeof theme.elementColors] ?? theme.degreeLabelColor) : theme.degreeLabelColor;
      tickColor = theme.angleStroke;
      tokens = [
        { text: anglePoint.label, color: theme.angleStroke, bold: false, extraGapAfter: true, size: sizes.planet },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: signGlyph, color: signColor, bold: false },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
    } else {
      // Planet label
      const body = pos.body as CelestialBody;
      const zodiacPos = data.zodiac_positions[body];
      if (!zodiacPos) continue;

      const isRetrograde = zodiacPos.is_retrograde ?? false;
      const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;
      const planetGlyph = (PLANET_GLYPHS[pos.body] ?? "") + "\uFE0E";
      const deg = String(zodiacPos.degree).padStart(2, "0");
      const min = String(zodiacPos.minute).padStart(2, "0");
      const signGlyph = (SIGN_GLYPHS[zodiacPos.sign] ?? "");
      const element = SIGN_ELEMENT[zodiacPos.sign];
      const signColor = element ? (theme.elementColors[element] ?? theme.degreeLabelColor) : theme.degreeLabelColor;

      tickColor = color;
      tokens = [
        { text: planetGlyph, color, bold: true, extraGapAfter: false, size: sizes.planet },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: signGlyph, color: signColor, bold: false },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
      if (isRetrograde) {
        tokens.push({ text: "℞", color, bold: false, small: true });
      }
    }

    // Draw tick mark at true ecliptic position on zodiac inner edge
    const s = radius / 300;
    const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
    const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 6 * s);
    ctx.beginPath();
    ctx.moveTo(tickOuter.x, tickOuter.y);
    ctx.lineTo(tickInner.x, tickInner.y);
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Place each token along the radial spoke, stepping inward from the zodiac ring
    let currentR = zodiacInnerR - 20 * s;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const token of tokens) {
      const size = token.size ?? (token.small ? minuteFontSize : fontSize);
      ctx.font = token.bold ? `bold ${size}px serif` : `${size}px serif`;
      ctx.fillStyle = token.color;
      const p = polarToCartesian(cx, cy, pos.displayAngle, currentR);
      ctx.fillText(token.text, p.x, p.y);
      currentR -= size + gap + (token.extraGapAfter ? Math.round(fontSize * 0.6) : 0);
    }

    // Leader line from displaced label back to true position on zodiac inner edge
    if (pos.displaced) {
      const leaderFrom = polarToCartesian(cx, cy, pos.displayAngle, zodiacInnerR - 13 * s);
      const leaderTo = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 4 * s);
      ctx.beginPath();
      ctx.moveTo(leaderFrom.x, leaderFrom.y);
      ctx.lineTo(leaderTo.x, leaderTo.y);
      ctx.strokeStyle = theme.leaderLineColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}
