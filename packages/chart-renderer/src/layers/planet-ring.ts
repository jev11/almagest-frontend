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

  // House cusp angles act as fixed repulsors in the collision resolver.
  // Exclude angular cusps (1,4,7,10 = indices 0,3,6,9) — they have dedicated
  // angle labels rendered separately.
  const ANGULAR_INDICES = new Set([0, 3, 6, 9]);
  const cuspBlockers = data.houses.cusps
    .filter((c, i): c is number => c !== undefined && !ANGULAR_INDICES.has(i))
    .map((cuspLon) => longitudeToAngle(cuspLon, ascendant));

  // Angle labels are fixed (not movable). Remove them from the planet pool
  // and add their positions as blockers so the resolver pushes planets away.
  // Fan out multiple blocker points to cover the full angular width of each label.
  // Angle labels occupy significant radial space (glyph + degree + sign + minute),
  // so the exclusion zone must be wide enough to prevent overlaps.
  const axisOffsetRad = 8 / planetRingR;
  const angleLabelSpan = 18 / planetRingR; // step between blocker points
  const angleBlockerPositions: number[] = [];
  for (const ap of anglePoints) {
    const center = longitudeToAngle(ap.lon, ascendant) + axisOffsetRad;
    for (let step = -1; step <= 2; step++) {
      angleBlockerPositions.push(center + step * angleLabelSpan);
    }
  }

  // Remove angle points from planet positions — they'll be rendered separately
  const planetPositions = glyphPositions.filter(
    (pos) => !anglePoints.some((ap) => ap.id === pos.body),
  );

  // Resolve collisions for planet labels only, with angle + cusp blockers
  const allBlockers = [...cuspBlockers, ...angleBlockerPositions];
  const resolved = resolveCollisions(planetPositions, planetRingR, allBlockers);

  // Re-insert angle points at their fixed positions for rendering
  for (const ap of anglePoints) {
    const nudgedAngle = longitudeToAngle(ap.lon, ascendant) + axisOffsetRad;
    resolved.push({
      body: ap.id,
      originalAngle: nudgedAngle,
      displayAngle: nudgedAngle,
      displaced: false,
    });
  }

  // Clamp each planet label within its house boundaries.
  // The collision resolver can push labels up to 89px, which may cross a cusp line.
  // We find the two cusp angles bracketing the planet's original position and hard-clamp.
  // Angular cusps (AS/DS/MC/IC) need a wider margin because they have large labels.
  const angularCuspAngles = new Set<number>();
  for (const ap of anglePoints) {
    angularCuspAngles.add(longitudeToAngle(ap.lon, ascendant));
  }

  const allCuspAngles = data.houses.cusps
    .filter((c): c is number => c !== undefined)
    .map((cuspLon) => longitudeToAngle(cuspLon, ascendant))
    .sort((a, b) => a - b);

  const houseMargin = 8 / planetRingR; // stay this many pixels away from regular cusp line
  const angleMargin = 34 / planetRingR; // wider margin for angular cusps with labels
  const anglePointIds = new Set(anglePoints.map((ap) => ap.id));

  function marginForCusp(cuspAngle: number): number {
    // Check if this cusp is near an angular cusp (within 0.01 rad tolerance)
    for (const ac of angularCuspAngles) {
      if (Math.abs(cuspAngle - ac) < 0.01) return angleMargin;
    }
    return houseMargin;
  }

  for (const pos of resolved) {
    // Only clamp planet labels, not angle point labels (ASC/DSC/MC/IC sit on cusps by design)
    if (anglePointIds.has(pos.body)) continue;

    // Find the two house cusp angles that bracket this planet's original position
    let lowerBound = -Infinity;
    let upperBound = Infinity;
    let lowerCusp = 0;
    let upperCusp = 0;
    for (const cuspAngle of allCuspAngles) {
      if (cuspAngle <= pos.originalAngle && cuspAngle > lowerBound) {
        lowerBound = cuspAngle;
        lowerCusp = cuspAngle;
      }
      if (cuspAngle > pos.originalAngle && cuspAngle < upperBound) {
        upperBound = cuspAngle;
        upperCusp = cuspAngle;
      }
    }

    if (lowerBound !== -Infinity) {
      pos.displayAngle = Math.max(pos.displayAngle, lowerBound + marginForCusp(lowerCusp));
    }
    if (upperBound !== Infinity) {
      pos.displayAngle = Math.min(pos.displayAngle, upperBound - marginForCusp(upperCusp));
    }

    // Re-evaluate displaced flag after clamping
    pos.displaced = Math.abs(pos.displayAngle - pos.originalAngle) > 0.001;
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
    // Skip for AS/DS only — their axis lines already indicate position. MC/IC keep ticks.
    const isAscDsc = pos.body === ANGLE_IDS.asc || pos.body === ANGLE_IDS.dsc;
    const s = radius / 300;
    if (!isAscDsc) {
      const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
      const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 6 * s);
      ctx.beginPath();
      ctx.moveTo(tickOuter.x, tickOuter.y);
      ctx.lineTo(tickInner.x, tickInner.y);
      ctx.strokeStyle = tickColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Place each token along the radial spoke, stepping inward from the zodiac ring
    let currentR = zodiacInnerR - 20 * s;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const token of tokens) {
      const size = token.size ?? (token.small ? minuteFontSize : fontSize);
      ctx.font = token.bold ? `bold ${size}px ${theme.fontFamily}` : `${size}px ${theme.fontFamily}`;
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
