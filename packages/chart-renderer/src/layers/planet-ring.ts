import { CelestialBody, SIGN_ORDER, SIGN_ELEMENT } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes, COLLISION } from "../core/constants.js";
import { PLANET_GLYPHS } from "../glyphs/planet-glyphs.js";
import { SIGN_GLYPHS } from "../glyphs/sign-glyphs.js";
import { drawGlyphText } from "../glyphs/draw.js";
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
  /** Unicode glyph character — if set, render via drawGlyphText instead of fillText. */
  glyphChar?: string;
}

/** Convert an ecliptic longitude to sign degree/minute/sign glyph */
function lonToSignParts(lon: number): { deg: string; min: string; signChar: string; signKey: string | undefined } {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const deg = String(Math.floor(norm % 30)).padStart(2, "0");
  const min = String(Math.floor((norm % 1) * 60)).padStart(2, "0");
  const signKey = SIGN_ORDER[signIndex];
  const signChar = signKey ? (SIGN_GLYPHS[signKey] ?? "") : "";
  return { deg, min, signChar, signKey };
}

export function drawPlanetRing(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  const { cx, cy, radius, density } = dim;
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

  // Add angle points (ASC, DSC, MC, IC) into the same pool.
  // AS/DS labels get a sideways nudge to clear the horizontal axis line;
  // MC/IC sit centered on their tick (vertical axis passes through the label,
  // which is acceptable and keeps the label visually aligned with its tick).
  // nudgeSign is populated below based on planet clustering around each axis.
  const anglePoints: Array<{
    id: string;
    lon: number;
    label: string;
    labelOffset: number;
    nudgeFromAxis: boolean;
    nudgeSign: 1 | -1;
  }> = [
    { id: ANGLE_IDS.asc, lon: data.houses.ascendant, label: "As", labelOffset: 0, nudgeFromAxis: true, nudgeSign: 1 },
    { id: ANGLE_IDS.dsc, lon: data.houses.descendant, label: "Ds", labelOffset: 0, nudgeFromAxis: true, nudgeSign: 1 },
    { id: ANGLE_IDS.mc, lon: data.houses.midheaven, label: "Mc", labelOffset: 0, nudgeFromAxis: false, nudgeSign: 1 },
    { id: ANGLE_IDS.ic, lon: data.houses.imum_coeli, label: "Ic", labelOffset: 0, nudgeFromAxis: false, nudgeSign: 1 },
  ];

  // Signed angular difference (a - b) on a circle, result in (-π, π].
  // Local copy to avoid exporting internals of layout.ts.
  const TWO_PI = 2 * Math.PI;
  const circularDiff = (a: number, b: number): number =>
    ((a - b) % TWO_PI + TWO_PI + Math.PI) % TWO_PI - Math.PI;

  // Sideways nudge magnitude for AS/DS labels to clear the horizontal axis
  // line. MC/IC labels are movable participants in the collision resolver
  // (not nudged by a fixed offset).
  const axisOffsetPx = 14;

  // Flip the AS/DS label to whichever side has fewer planets in the adjacent
  // ~1-sign window — the wide label blocker otherwise acts as a floor that
  // compresses a near-axis stellium and can collapse it into overlapping glyphs.
  const clusterWindow = Math.PI / 6;
  for (const ap of anglePoints) {
    if (!ap.nudgeFromAxis) continue;
    const apAngle = longitudeToAngle(ap.lon, ascendant);
    let countPositive = 0;
    let countNegative = 0;
    for (const gp of glyphPositions) {
      const diff = circularDiff(gp.originalAngle, apAngle);
      if (Math.abs(diff) > clusterWindow) continue;
      if (diff > 0) countPositive += 1;
      else if (diff < 0) countNegative += 1;
    }
    if (countPositive > countNegative) ap.nudgeSign = -1;
  }

  // If the AS/DS axis falls within 10° of a sign boundary, override nudgeSign
  // to push the label away from that boundary. Without this, the label can land
  // on the boundary side, trapping planets between the label and the cusp line.
  // AS and DS are always 180° apart, and 180 is divisible by 30, so they share
  // the same position within their signs — the check is consistent for both.
  const SIGN_BOUNDARY_THRESHOLD = 10;
  for (const ap of anglePoints) {
    if (!ap.nudgeFromAxis) continue;
    const posInSign = ap.lon % 30;
    if (posInSign < SIGN_BOUNDARY_THRESHOLD) {
      // Near the start of the sign; boundary is at lower longitude → push toward higher lon
      ap.nudgeSign = 1;
    } else if (posInSign > 30 - SIGN_BOUNDARY_THRESHOLD) {
      // Near the end of the sign; boundary is at higher longitude → push toward lower lon
      ap.nudgeSign = -1;
    }
  }

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
  // Exclude the AS/DS cusp indices (0, 6) — those are represented as wide
  // blockers via angleBlockerPositions. IC (index 3) and MC (index 9) cusp
  // lines stay as thin blockers; their labels are movable participants and
  // benefit from the normal cusp-line clearance.
  const cuspBlockers = data.houses.cusps
    .filter((c, i): c is number => c !== undefined && i !== 0 && i !== 6)
    .map((cuspLon) => longitudeToAngle(cuspLon, ascendant));

  // AS/DS labels are fixed (not movable). Pass their positions as wide blockers
  // so the resolver pushes planets away by the full minGlyphGap (not the halved
  // cusp-line gap). MC/IC labels participate in the resolver directly instead,
  // so they get pair-wise clearance from adjacent planets and can shift laterally.
  const axisOffsetRad = axisOffsetPx / planetRingR;
  const angleBlockerPositions: number[] = [];
  for (const ap of anglePoints) {
    if (ap.id !== ANGLE_IDS.asc && ap.id !== ANGLE_IDS.dsc) continue;
    const offset = ap.nudgeFromAxis ? axisOffsetRad * ap.nudgeSign : 0;
    angleBlockerPositions.push(longitudeToAngle(ap.lon, ascendant) + offset);
  }

  // Keep AS/DS out of the collision pool (they're injected at fixed positions
  // below). MC/IC stay in so the resolver can displace them around planets.
  const planetPositions = glyphPositions.filter(
    (pos) => pos.body !== ANGLE_IDS.asc && pos.body !== ANGLE_IDS.dsc,
  );

  // Resolve collisions: cusp lines as thin blockers, angle labels as wide blockers
  const resolved = resolveCollisions(planetPositions, planetRingR, cuspBlockers, angleBlockerPositions);

  // Re-insert AS/DS at their fixed positions for rendering. MC/IC are already
  // in `resolved` from the resolver call (possibly displaced).
  for (const ap of anglePoints) {
    if (ap.id !== ANGLE_IDS.asc && ap.id !== ANGLE_IDS.dsc) continue;
    const trueAngle = longitudeToAngle(ap.lon, ascendant);
    const labelAngle = ap.nudgeFromAxis ? trueAngle + axisOffsetRad * ap.nudgeSign : trueAngle;
    resolved.push({
      body: ap.id,
      originalAngle: trueAngle,
      displayAngle: labelAngle,
      displaced: false,
    });
  }

  // Clamp each planet label within its house boundaries.
  // The collision resolver can push labels up to 89px, which may cross a cusp line.
  // We find the two cusp angles bracketing the planet's original position and hard-clamp.
  // Angular cusps (AS/DS/MC/IC) need a wider margin because they have large labels.
  const angularCuspMatches: Array<{ angle: number; ap: typeof anglePoints[number] }> = anglePoints.map((ap) => ({
    angle: longitudeToAngle(ap.lon, ascendant),
    ap,
  }));

  const allCuspAngles = data.houses.cusps
    .filter((c): c is number => c !== undefined)
    .map((cuspLon) => longitudeToAngle(cuspLon, ascendant))
    .sort((a, b) => a - b);

  const houseMargin = 8 / planetRingR; // stay this many pixels away from regular cusp line
  const anglePointIds = new Set(anglePoints.map((ap) => ap.id));

  // AS/DS angular-cusp margin depends on which side the label was nudged to
  // relative to the planet. Same side: planet must clear past the label, so
  // minGlyphGap plus the axisOffset nudge. Opposite side: the label sits on
  // the far side of the axis; keep the full minGlyphGap so the clamp boundary
  // is far enough from the axis that snapped planets still have room to separate.
  // MC/IC fall through to `houseMargin`: their labels are movable, and the
  // resolver's pair-wise minGlyphGap already handles planet↔label spacing.
  function marginForCusp(cuspAngle: number, planetSide: 1 | -1): number {
    for (const { angle, ap } of angularCuspMatches) {
      if (Math.abs(cuspAngle - angle) < 0.01) {
        if (ap.id === ANGLE_IDS.mc || ap.id === ANGLE_IDS.ic) return houseMargin;
        const sameSide = ap.nudgeSign === planetSide;
        const px = sameSide ? COLLISION.minGlyphGap + axisOffsetPx : COLLISION.minGlyphGap;
        return px / planetRingR;
      }
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
      pos.displayAngle = Math.max(pos.displayAngle, lowerBound + marginForCusp(lowerCusp, 1));
    }
    if (upperBound !== Infinity) {
      pos.displayAngle = Math.min(pos.displayAngle, upperBound - marginForCusp(upperCusp, -1));
    }

    // Re-evaluate displaced flag after clamping
    pos.displaced = Math.abs(pos.displayAngle - pos.originalAngle) > 0.001;
  }

  const sizes = glyphSizes(radius);
  // Planet glyph size scales with glyphScale; degree labels use the absolute
  // labelSize from density so they match the chart-info / house-cusp label
  // scale at each breakpoint. `minuteFontSize` keeps the 0.70 ratio.
  const planetGlyphSize = sizes.planet * density.glyphScale;
  const signGlyphSize = sizes.degreeLabel * density.glyphScale;
  const fontSize = density.labelSize;
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
      const { deg, min, signChar, signKey } = lonToSignParts(anglePoint.lon);
      const element = signKey ? SIGN_ELEMENT[signKey as keyof typeof SIGN_ELEMENT] : undefined;
      const signColor = element ? (theme.elementColors[element as keyof typeof theme.elementColors] ?? theme.degreeLabelColor) : theme.degreeLabelColor;
      tickColor = theme.angleStroke;
      tokens = [
        { text: anglePoint.label, color: theme.angleStroke, bold: false, extraGapAfter: true, size: planetGlyphSize },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: "", color: signColor, bold: false, glyphChar: signChar, size: signGlyphSize },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
    } else {
      // Planet label
      const body = pos.body as CelestialBody;
      const zodiacPos = data.zodiac_positions[body];
      if (!zodiacPos) continue;

      const isRetrograde = zodiacPos.is_retrograde ?? false;
      const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;
      const planetChar = PLANET_GLYPHS[pos.body] ?? "";
      const deg = String(zodiacPos.degree).padStart(2, "0");
      const min = String(zodiacPos.minute).padStart(2, "0");
      const signChar = SIGN_GLYPHS[zodiacPos.sign] ?? "";
      const element = SIGN_ELEMENT[zodiacPos.sign];
      const signColor = element ? (theme.elementColors[element] ?? theme.degreeLabelColor) : theme.degreeLabelColor;

      tickColor = color;
      tokens = [
        { text: "", color, bold: true, extraGapAfter: false, size: planetGlyphSize, glyphChar: planetChar },
        { text: deg, color: theme.degreeLabelColor, bold: false },
        { text: "", color: signColor, bold: false, glyphChar: signChar, size: signGlyphSize },
        { text: min, color: theme.degreeLabelColor, bold: false, small: true },
      ];
      if (isRetrograde) {
        tokens.push({ text: "℞", color, bold: false, small: true });
      }
    }

    // Draw tick mark at true ecliptic position on zodiac inner edge.
    // Skip for AS/DS only — their axis lines already indicate position. MC/IC keep ticks.
    const isAscDsc = pos.body === ANGLE_IDS.asc || pos.body === ANGLE_IDS.dsc;
    const s = radius / 300;
    if (!isAscDsc) {
      const tickOuter = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR);
      const tickInner = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 6 * s * density.glyphScale);
      ctx.beginPath();
      ctx.moveTo(tickOuter.x, tickOuter.y);
      ctx.lineTo(tickInner.x, tickInner.y);
      ctx.strokeStyle = tickColor;
      ctx.lineWidth = 1 * density.stroke;
      ctx.stroke();
    }

    // Place each token along the radial spoke, stepping inward from the zodiac ring
    let currentR = zodiacInnerR - 20 * s;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const token of tokens) {
      const size = token.size ?? (token.small ? minuteFontSize : fontSize);
      const p = polarToCartesian(cx, cy, pos.displayAngle, currentR);
      if (token.glyphChar) {
        drawGlyphText(ctx, token.glyphChar, p.x, p.y, size, token.color);
      } else {
        ctx.font = token.bold ? `bold ${size}px ${theme.fontFamily}` : `${size}px ${theme.fontFamily}`;
        ctx.fillStyle = token.color;
        ctx.fillText(token.text, p.x, p.y);
      }
      currentR -= size + gap + (token.extraGapAfter ? Math.round(fontSize * 0.6) : 0);
    }

    // Leader line from displaced label back to true position on zodiac inner edge.
    // `0.5` is intentional subpixel width — the leader is a hairline hint, not a
    // structural stroke, so we only apply `stroke` multiplier without rounding up.
    if (pos.displaced) {
      const leaderFrom = polarToCartesian(cx, cy, pos.displayAngle, zodiacInnerR - 13 * s);
      const leaderTo = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 4 * s);
      ctx.beginPath();
      ctx.moveTo(leaderFrom.x, leaderFrom.y);
      ctx.lineTo(leaderTo.x, leaderTo.y);
      ctx.strokeStyle = theme.leaderLineColor;
      ctx.lineWidth = 0.5 * density.stroke;
      ctx.stroke();
    }
  }
}
