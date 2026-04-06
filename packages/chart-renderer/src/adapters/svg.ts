import { SIGN_ORDER, SIGN_ELEMENT, type ChartData, CelestialBody, type AspectType } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, glyphSizes, MAJOR_ASPECTS } from "../core/constants.js";
import { SIGN_GLYPHS } from "../glyphs/signs.js";
import { PLANET_GLYPHS } from "../glyphs/planets.js";
import { resolveCollisions, type GlyphPosition } from "../core/layout.js";
import type { ChartTheme } from "../themes/types.js";

const RENDERED_BODIES: CelestialBody[] = [
  CelestialBody.Sun, CelestialBody.Moon, CelestialBody.Mercury,
  CelestialBody.Venus, CelestialBody.Mars, CelestialBody.Jupiter,
  CelestialBody.Saturn, CelestialBody.Uranus, CelestialBody.Neptune,
  CelestialBody.Pluto, CelestialBody.MeanNorthNode, CelestialBody.TrueNorthNode,
  CelestialBody.MeanSouthNode, CelestialBody.TrueSouthNode, CelestialBody.Chiron,
];

function hexWithOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return hex + alpha;
}

function orbToOpacity(orb: number): number {
  if (orb <= 1.0) return 1.0;
  if (orb <= 3.0) return 0.7;
  if (orb <= 5.0) return 0.4;
  return 0.2;
}

function svgArcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
  // Arc goes counter-clockwise (sweep-flag=0 in SVG which goes clockwise by default,
  // but our angles are set up so we need sweep=0 for counter-clockwise in screen coords)
  // SVG arc: A rx ry x-rotation large-arc-flag sweep-flag x y
  // sweep-flag=0: counter-clockwise, sweep-flag=1: clockwise

  const outerStart = polarToCartesian(cx, cy, startAngle, outerR);
  const outerEnd = polarToCartesian(cx, cy, endAngle, outerR);
  const innerStart = polarToCartesian(cx, cy, startAngle, innerR);
  const innerEnd = polarToCartesian(cx, cy, endAngle, innerR);

  // For zodiac segments, we go counter-clockwise (sweep=0 in SVG = counter-clockwise)
  // Large arc flag: 0 (each sign is 30° < 180°)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 0 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 0 1 ${innerStart.x} ${innerStart.y}`,
    `Z`,
  ].join(" ");
}

export function renderRadixToSvg(
  data: ChartData,
  theme: ChartTheme,
  width: number,
  height: number,
  padding = 20,
): string {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - padding;
  const ascendant = data.houses.ascendant;

  const outerR = radius * RING_PROPORTIONS.zodiacOuter;
  const innerR = radius * RING_PROPORTIONS.zodiacInner;
  const aspectR = radius * RING_PROPORTIONS.aspectOuter;
  const planetRingR = (innerR + radius * RING_PROPORTIONS.planetInner) / 2;

  const parts: string[] = [];

  // Background
  parts.push(`<rect width="${width}" height="${height}" fill="${theme.background}"/>`);

  // Zodiac ring segments
  for (let i = 0; i < 12; i++) {
    const sign = SIGN_ORDER[i];
    if (!sign) continue;
    const element = SIGN_ELEMENT[sign];
    const startLon = i * 30;
    const endLon = (i + 1) * 30;
    const startAngle = longitudeToAngle(startLon, ascendant);
    const endAngle = longitudeToAngle(endLon, ascendant);

    const elementColor = theme.elementColors[element];
    const pathD = svgArcPath(cx, cy, outerR, innerR, startAngle, endAngle);
    parts.push(`<path d="${pathD}" fill="${elementColor}" fill-opacity="${theme.elementBgOpacity}"/>`);

    // Divider line
    const divOuter = polarToCartesian(cx, cy, startAngle, outerR);
    const divInner = polarToCartesian(cx, cy, startAngle, innerR);
    parts.push(`<line x1="${divOuter.x}" y1="${divOuter.y}" x2="${divInner.x}" y2="${divInner.y}" stroke="${theme.signDividerStroke}" stroke-width="${theme.signDividerWidth}"/>`);

    // Sign glyph - render as Unicode text
    const midLon = i * 30 + 15;
    const midAngle = longitudeToAngle(midLon, ascendant);
    const glyphR = (outerR + innerR) / 2;
    const glyphPos = polarToCartesian(cx, cy, midAngle, glyphR);
    const glyphSize = glyphSizes(radius).sign;
    const glyphChar = SIGN_GLYPHS[sign as string];
    if (glyphChar) {
      parts.push(`<text x="${glyphPos.x}" y="${glyphPos.y}" fill="${theme.signGlyphColor}" font-size="${glyphSize}" font-family="${theme.fontFamily}" text-anchor="middle" dominant-baseline="middle">${glyphChar}</text>`);
    }
  }

  // Ring outlines
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="${theme.ringStroke}" stroke-width="${theme.ringStrokeWidth}"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${theme.ringStroke}" stroke-width="${theme.ringStrokeWidth}"/>`);

  // Degree tick marks
  for (let deg = 0; deg < 360; deg++) {
    const angle = longitudeToAngle(deg, ascendant);
    let tickLen: number;
    let tickW: number;
    const ts = radius / 300;
    if (deg % 10 === 0) { tickLen = 6 * ts; tickW = 1; }
    else if (deg % 5 === 0) { tickLen = 4 * ts; tickW = 1; }
    else { tickLen = 2 * ts; tickW = 0.5; }

    const outer = polarToCartesian(cx, cy, angle, innerR);
    const inner = polarToCartesian(cx, cy, angle, innerR - tickLen);
    parts.push(`<line x1="${outer.x}" y1="${outer.y}" x2="${inner.x}" y2="${inner.y}" stroke="${theme.ringStroke}" stroke-width="${tickW}"/>`);
  }

  // House overlay
  const houseNumberOuterR = radius * (RING_PROPORTIONS.zodiacOuter * 0.40 + 0.07);
  const ANGULAR_HOUSES = new Set([1, 4, 7, 10]);
  for (let i = 0; i < 12; i++) {
    const houseNum = i + 1;
    const cuspLon = data.houses.cusps[i];
    if (cuspLon === undefined) continue;

    const angle = longitudeToAngle(cuspLon, ascendant);
    const isAngular = ANGULAR_HOUSES.has(houseNum);

    const lineOuterR = isAngular ? outerR : innerR;
    const lineInnerR = isAngular ? 0 : aspectR;
    const strokeColor = isAngular ? theme.angleStroke : theme.houseStroke;
    const strokeWidth = isAngular ? theme.angleStrokeWidth : theme.houseStrokeWidth;

    const pt1 = polarToCartesian(cx, cy, angle, lineOuterR);
    const pt2 = polarToCartesian(cx, cy, angle, lineInnerR);
    parts.push(`<line x1="${pt1.x}" y1="${pt1.y}" x2="${pt2.x}" y2="${pt2.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`);
  }

  // House number ring circle
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${houseNumberOuterR}" fill="none" stroke="${theme.ringStroke}" stroke-width="${theme.ringStrokeWidth}"/>`);

  // House numbers at mid-ring between houseNumberOuterR and aspectR
  const numberR = (houseNumberOuterR + aspectR) / 2;
  for (let i = 0; i < 12; i++) {
    const cuspLon = data.houses.cusps[i];
    const nextCuspLon = data.houses.cusps[(i + 1) % 12];
    if (cuspLon === undefined || nextCuspLon === undefined) continue;

    const diff = ((nextCuspLon - cuspLon) % 360 + 360) % 360;
    const midLon = (cuspLon + diff / 2) % 360;

    const midAngle = longitudeToAngle(midLon, ascendant);
    const pos = polarToCartesian(cx, cy, midAngle, numberR);
    parts.push(`<text x="${pos.x}" y="${pos.y}" fill="${theme.houseNumberColor}" font-size="${glyphSizes(radius).houseNumber}" font-family="${theme.fontFamily}" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>`);
  }

  // Aspect web — fill circle with background to clear house lines, then clip
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${aspectR}" fill="${theme.background}"/>`);
  parts.push(`<defs><clipPath id="aspect-clip"><circle cx="${cx}" cy="${cy}" r="${aspectR}"/></clipPath></defs>`);
  for (const aspect of data.aspects) {
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
    const lineWidth = isMajor ? theme.aspectMajorWidth : theme.aspectMinorWidth;
    const dashAttr = isMajor ? "" : `stroke-dasharray="${theme.aspectMinorDash.join(",")}"`;

    parts.push(`<line x1="${pt1.x}" y1="${pt1.y}" x2="${pt2.x}" y2="${pt2.y}" stroke="${color}" stroke-width="${lineWidth}" ${dashAttr} clip-path="url(#aspect-clip)"/>`);
  }

  // Aspect circle outline (on top of lines)
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${aspectR}" fill="none" stroke="${theme.ringStroke}" stroke-width="${theme.ringStrokeWidth}"/>`);


  // Planet ring
  const glyphPositions: GlyphPosition[] = [];
  for (const body of RENDERED_BODIES) {
    const position = data.positions[body];
    if (!position) continue;
    const angle = longitudeToAngle(position.longitude, ascendant);
    glyphPositions.push({ body: body as string, originalAngle: angle, displayAngle: angle, displaced: false });
  }

  const resolved = resolveCollisions(glyphPositions, planetRingR);

  for (const pos of resolved) {
    const body = pos.body as CelestialBody;
    const zodiacPos = data.zodiac_positions[body];
    const isRetrograde = zodiacPos?.is_retrograde ?? false;
    const color = isRetrograde ? theme.planetGlyphRetrograde : theme.planetGlyph;
    const glyphSize = glyphSizes(radius).planet;
    const glyphChar = PLANET_GLYPHS[pos.body];

    const glyphPos = polarToCartesian(cx, cy, pos.displayAngle, planetRingR);

    if (glyphChar) {
      parts.push(`<text x="${glyphPos.x}" y="${glyphPos.y}" fill="${color}" font-size="${glyphSize}" font-family="${theme.fontFamily}" text-anchor="middle" dominant-baseline="middle">${glyphChar}</text>`);
    }

    if (pos.displaced) {
      const exactPos = polarToCartesian(cx, cy, pos.originalAngle, innerR - 2);
      parts.push(`<line x1="${glyphPos.x}" y1="${glyphPos.y}" x2="${exactPos.x}" y2="${exactPos.y}" stroke="${theme.leaderLineColor}" stroke-width="0.5"/>`);
    }
  }

  // Degree labels
  const labelR = radius * ((RING_PROPORTIONS.labelOuter + RING_PROPORTIONS.zodiacOuter) / 2);
  for (const body of RENDERED_BODIES) {
    const zodiacPos = data.zodiac_positions[body];
    const position = data.positions[body];
    if (!zodiacPos || !position) continue;

    const angle = longitudeToAngle(position.longitude, ascendant);
    const pos = polarToCartesian(cx, cy, angle, labelR);

    const deg = String(zodiacPos.degree).padStart(2, "0");
    const min = String(zodiacPos.minute).padStart(2, "0");
    let label = `${deg}°${min}'`;
    if (zodiacPos.is_retrograde) label += " ℞";

    // Rotate to follow radial direction
    const textAngleDeg = (-angle + Math.PI / 2) * (180 / Math.PI);
    parts.push(`<text x="${pos.x}" y="${pos.y}" fill="${theme.degreeLabelColor}" font-size="${glyphSizes(radius).degreeLabel}" font-family="${theme.fontFamily}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${textAngleDeg},${pos.x},${pos.y})">${label}</text>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${parts.join("\n")}
</svg>`;
}
