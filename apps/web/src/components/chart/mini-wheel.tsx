import { useId } from "react";
import type { JSX } from "react";
import type { ChartData } from "@astro-app/shared-types";
import { CelestialBody, AspectType } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";

export type MiniWheelVariant = "compact" | "featured";

export interface MiniWheelHouses {
  ascendant: number;
  descendant: number;
  midheaven: number;
  imum_coeli: number;
  /** 12 house cusp longitudes (cusp 1 = ASC, 4 = IC, 7 = DSC, 10 = MC). */
  cusps?: number[];
}

export interface MiniWheelAspect {
  aLng: number;
  bLng: number;
  type: AspectType;
}

export interface MiniWheelProps {
  size: number;
  positions: Array<[number, string]>;
  ascDeg: number;
  variant?: MiniWheelVariant;
  retrograde?: boolean[];
  houses?: MiniWheelHouses;
  aspects?: MiniWheelAspect[];
  className?: string;
}

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
// Mirrors packages/chart-renderer/src/glyphs/draw.ts → GLYPH_FONT_FAMILY.
const GLYPH_FONT_FAMILY = "'Noto Sans Symbols 2', 'Noto Sans Symbols', sans-serif";
const SIGN_ELEMENTS: Array<"fire" | "earth" | "air" | "water"> = [
  "fire", "earth", "air", "water",
  "fire", "earth", "air", "water",
  "fire", "earth", "air", "water",
];

const PLANET_ORDER: CelestialBody[] = [
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
];

// Aspect color tokens (mirrors apps/web/src/components/home/aspect-grid.tsx).
const ASPECT_COLORS: Partial<Record<AspectType, string>> = {
  [AspectType.Sextile]: "var(--primary)",
  [AspectType.Square]: "var(--destructive)",
  [AspectType.Trine]: "var(--aspect-trine, var(--primary))",
  [AspectType.Opposition]: "var(--destructive)",
  [AspectType.Quincunx]: "var(--aspect-quincunx, var(--muted-foreground))",
  [AspectType.SemiSextile]: "var(--muted-foreground)",
  [AspectType.SemiSquare]: "var(--muted-foreground)",
  [AspectType.Sesquisquare]: "var(--muted-foreground)",
  [AspectType.Quintile]: "var(--muted-foreground)",
  [AspectType.BiQuintile]: "var(--muted-foreground)",
};

const MAJOR_ASPECTS = new Set<AspectType>([
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
]);

type Tier = "S" | "M" | "L";

function tierFor(size: number): Tier {
  if (size < 64) return "S";
  if (size < 200) return "M";
  return "L";
}

interface RingGeometry {
  r: number;
  cx: number;
  cy: number;
  rOuter: number;
  rZodiacOuter: number;
  rZodiacInner: number;
  rPlanetInner: number;
  rPlanetCenter: number;
  rAspect: number;
}

// Golden ratio. Mirrors packages/chart-renderer/src/core/constants.ts:
// zodiac band width / planet band width = φ, and planet-inner / aspect-outer = φ.
const PHI = 1.6180339887498949;

// Ring fractions of total radius (identical across all tiers — the chart
// wheel uses these exact φ-based proportions, so the mini-wheel does too).
//   zodiac band: 0.950 → 0.796  (width 0.154)
//   planet band: 0.796 → 0.700  (width 0.096 ≈ 0.154 / φ)
//   aspect circle outer: 0.700 / φ ≈ 0.4326
const RING_FRACTIONS = {
  zodiacOuter: 0.95,
  zodiacInner: 0.796,
  planetInner: 0.70,
  aspectOuter: 0.70 / PHI,
} as const;

/**
 * Spread a list of longitudes so no two are closer than `minGapDeg`,
 * by pushing neighbours apart tangentially. Returns displacement-resolved
 * angles in the SAME index order as the input (the original longitude
 * for index `i` corresponds to `result[i]`).
 *
 * Lighter weight than the canvas renderer's spring-force pass — a greedy
 * pairwise sweep that converges in a few iterations for typical stelliums.
 */
function distributePlanets(longitudes: number[], minGapDeg: number): number[] {
  const n = longitudes.length;
  if (n < 2 || minGapDeg <= 0) return [...longitudes];

  // Sort indices by longitude so we can sweep neighbouring pairs.
  const order = longitudes
    .map((d, i) => ({ d: ((d % 360) + 360) % 360, i }))
    .sort((a, b) => a.d - b.d);
  const display = order.map((o) => o.d);

  const maxIter = 40;
  for (let it = 0; it < maxIter; it++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const next = (k + 1) % n;
      const raw = display[next] - display[k];
      // Wrap around the 360° boundary for the (n-1, 0) pair.
      const gap = raw <= 0 ? raw + 360 : raw;
      if (gap < minGapDeg) {
        const push = (minGapDeg - gap) / 2;
        display[k] = (display[k] - push + 360) % 360;
        display[next] = (display[next] + push) % 360;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const result = new Array<number>(n);
  for (let k = 0; k < n; k++) result[order[k].i] = display[k];
  return result;
}

function geometryFor(size: number): RingGeometry {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const rOuter = r * RING_FRACTIONS.zodiacOuter;
  const rZodiacOuter = rOuter;
  const rZodiacInner = r * RING_FRACTIONS.zodiacInner;
  const rPlanetInner = r * RING_FRACTIONS.planetInner;
  const rPlanetCenter = (rZodiacInner + rPlanetInner) / 2;
  const rAspect = r * RING_FRACTIONS.aspectOuter;
  return { r, cx, cy, rOuter, rZodiacOuter, rZodiacInner, rPlanetInner, rPlanetCenter, rAspect };
}

export function MiniWheel({
  size,
  positions,
  ascDeg,
  variant,
  retrograde,
  houses,
  aspects,
  className,
}: MiniWheelProps): JSX.Element {
  const clipIdBase = useId();
  const safeId = clipIdBase.replace(/:/g, "");
  const clipId = `mw-clip-${safeId}`;
  const aspectClipId = `mw-asp-${safeId}`;

  // Allow legacy "featured" variant to bump tier when explicitly requested
  // even at smaller sizes (used by empty-state demo at 300px).
  const baseTier = tierFor(size);
  const tier: Tier =
    variant === "featured" && baseTier === "M" ? "L" : baseTier;

  const g = geometryFor(size);

  // Polar conversion mirrors packages/chart-renderer/src/core/geometry.ts
  // (longitudeToAngle + polarToCartesian): ASC anchored at 9 o'clock (left),
  // DSC at 3 o'clock (right), MC at 12 o'clock (top), IC at 6 o'clock (bottom).
  const deg2xy = (deg: number, radius: number): [number, number] => {
    const a = ((deg - ascDeg + 180) * Math.PI) / 180;
    return [g.cx + Math.cos(a) * radius, g.cy - Math.sin(a) * radius];
  };

  // Build a 30° annular wedge path for a zodiac segment.
  // With ASC anchored at 9 o'clock and longitudes increasing CCW on screen
  // (matching the canvas wheel), the outer arc sweeps in the negative-angle
  // direction (sweep=0) and the return inner arc sweeps positive (sweep=1).
  const segmentPath = (startDeg: number, endDeg: number): string => {
    const [sox, soy] = deg2xy(startDeg, g.rZodiacOuter);
    const [eox, eoy] = deg2xy(endDeg, g.rZodiacOuter);
    const [eix, eiy] = deg2xy(endDeg, g.rZodiacInner);
    const [six, siy] = deg2xy(startDeg, g.rZodiacInner);
    return [
      `M ${sox} ${soy}`,
      `A ${g.rZodiacOuter} ${g.rZodiacOuter} 0 0 0 ${eox} ${eoy}`,
      `L ${eix} ${eiy}`,
      `A ${g.rZodiacInner} ${g.rZodiacInner} 0 0 1 ${six} ${siy}`,
      "Z",
    ].join(" ");
  };

  const showSignGlyphs = tier !== "S";
  const showPlanetGlyphs = tier !== "S";
  const showAxes = tier !== "S";
  const showAxisLabels = tier === "L";
  const showDegreeTicks = tier === "L";
  const showAspects = tier === "L" && aspects && aspects.length > 0;

  // Glyph sizes scale with radius (Fibonacci-ish, mirrors chart-renderer)
  const signFontSize = Math.max(8, Math.round(g.r * 0.115));
  const planetFontSize = Math.max(8, Math.round(g.r * 0.082));
  const axisLabelFontSize = Math.max(7, Math.round(g.r * 0.04));
  // Planet dots only render at Tier S (no glyphs competing for space).
  const planetDotR = Math.max(1.3, g.r * 0.075);
  // Resolve clusters: minimum tangential gap (in degrees) at the planet ring.
  // Computed from glyph/dot pixel size projected onto the ring radius — a
  // light-weight stand-in for the canvas wheel's spring-force collision pass.
  const collisionPx = showPlanetGlyphs ? planetFontSize * 1.05 : planetDotR * 2.1;
  const minGapDeg = (collisionPx / Math.max(g.rPlanetCenter, 1)) * (180 / Math.PI);
  const displayLngs = distributePlanets(positions.map(([l]) => l), minGapDeg);
  // Element segment opacity: bump higher at small sizes since there are
  // no glyphs filling the band; at large sizes 0.22 mirrors the canvas wheel.
  const segmentOpacity = tier === "S" ? 0.42 : tier === "M" ? 0.26 : 0.22;

  // House angles — fall back to ASC + 180° / asc + 90° when not provided
  const angleAsc = ascDeg;
  const angleDsc = houses?.descendant ?? (ascDeg + 180) % 360;
  const angleMc = houses?.midheaven ?? (ascDeg + 270) % 360;
  const angleIc = houses?.imum_coeli ?? (ascDeg + 90) % 360;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={g.cx} cy={g.cy} r={g.rZodiacInner} />
        </clipPath>
        {showAspects && (
          <clipPath id={aspectClipId}>
            <circle cx={g.cx} cy={g.cy} r={g.rAspect} />
          </clipPath>
        )}
      </defs>

      {/* 1. Element-tinted segment fills */}
      <g opacity={segmentOpacity}>
        {Array.from({ length: 12 }).map((_, i) => (
          <path
            key={`seg-${i}`}
            d={segmentPath(i * 30, (i + 1) * 30)}
            fill={`var(--${SIGN_ELEMENTS[i]})`}
          />
        ))}
      </g>

      {/* 2. Sign dividers + zodiac ring outlines */}
      {Array.from({ length: 12 }).map((_, i) => {
        const d = i * 30;
        const [x1, y1] = deg2xy(d, g.rZodiacInner);
        const [x2, y2] = deg2xy(d, g.rZodiacOuter);
        return (
          <line
            key={`div-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--border-strong)"
            strokeWidth={tier === "L" ? 1 : 0.6}
          />
        );
      })}
      <circle
        cx={g.cx}
        cy={g.cy}
        r={g.rZodiacOuter}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={tier === "L" ? 1 : 0.75}
      />
      <circle
        cx={g.cx}
        cy={g.cy}
        r={g.rZodiacInner}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={tier === "L" ? 1 : 0.5}
      />

      {/* 3. Degree ticks (Tier L only) */}
      {showDegreeTicks && (
        <g stroke="var(--border-strong)">
          {Array.from({ length: 360 }).map((_, deg) => {
            const isMajor = deg % 10 === 0;
            const isMid = !isMajor && deg % 5 === 0;
            const tickLen = isMajor ? g.r * 0.022 : isMid ? g.r * 0.014 : g.r * 0.007;
            const w = isMajor ? 1 : 0.6;
            const [x1, y1] = deg2xy(deg, g.rZodiacInner);
            const [x2, y2] = deg2xy(deg, g.rZodiacInner - tickLen);
            return (
              <line
                key={`tick-${deg}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                strokeWidth={w}
                opacity={isMajor ? 0.9 : isMid ? 0.6 : 0.35}
              />
            );
          })}
        </g>
      )}

      {/* 4. Sign glyphs (centered in segments) */}
      {showSignGlyphs &&
        Array.from({ length: 12 }).map((_, i) => {
          const mid = i * 30 + 15;
          const [x, y] = deg2xy(mid, (g.rZodiacOuter + g.rZodiacInner) / 2);
          return (
            <text
              key={`sign-${i}`}
              x={x}
              y={y}
              fontSize={signFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: "var(--fg-dim)",
                fontFamily: GLYPH_FONT_FAMILY,
              }}
            >
              {SIGN_GLYPHS[i]}
            </text>
          );
        })}

      {/* 5a. Intermediate house cusps (8 of 12 — angular ones are drawn
            as accent axes below). Mirrors canvas house-overlay treatment:
            thin border-color lines from inner zodiac edge to aspect circle. */}
      {showAxes && houses?.cusps && houses.cusps.length === 12 && (
        <g>
          {houses.cusps.map((deg, i) => {
            // Skip angular cusps (1=ASC, 4=IC, 7=DSC, 10=MC) — drawn separately
            if (i === 0 || i === 3 || i === 6 || i === 9) return null;
            const [x1, y1] = deg2xy(deg, g.rZodiacInner);
            const [x2, y2] = deg2xy(deg, g.rAspect || g.rPlanetInner * 0.5);
            return (
              <line
                key={`cusp-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--border-strong)"
                strokeWidth={tier === "L" ? 0.8 : 0.5}
                opacity={0.6}
              />
            );
          })}
        </g>
      )}

      {/* 5b. Angle axes (ASC/DSC/MC/IC) clipped to inner zodiac ring */}
      {showAxes && (
        <g clipPath={`url(#${clipId})`}>
          {[angleAsc, angleDsc, angleMc, angleIc].map((deg, i) => {
            const [x1, y1] = deg2xy(deg, g.rZodiacInner);
            const [x2, y2] = deg2xy(deg, -g.rZodiacInner);
            return (
              <line
                key={`axis-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--accent)"
                strokeWidth={tier === "L" ? 1 : 0.6}
                opacity={i < 2 ? 0.85 : 0.7}
              />
            );
          })}
        </g>
      )}

      {/* 6. Axis labels */}
      {showAxisLabels && (
        <g
          fontSize={axisLabelFontSize}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.1em",
            fill: "var(--fg-dim)",
          }}
        >
          {[
            { lab: "As", deg: angleAsc, dx: 6, dy: -3 },
            { lab: "Ds", deg: angleDsc, dx: -14, dy: -3 },
            { lab: "Mc", deg: angleMc, dx: 4, dy: 9 },
            { lab: "Ic", deg: angleIc, dx: 4, dy: -3 },
          ].map(({ lab, deg, dx, dy }) => {
            const [x, y] = deg2xy(deg, g.rZodiacInner);
            return (
              <text key={lab} x={x + dx} y={y + dy}>
                {lab}
              </text>
            );
          })}
        </g>
      )}

      {/* 7. Aspect web (Tier L only, when aspects supplied) */}
      {showAspects && (
        <g clipPath={`url(#${aspectClipId})`}>
          {/* aspect circle background to cover axis lines underneath */}
          <circle
            cx={g.cx}
            cy={g.cy}
            r={g.rAspect}
            fill="var(--card, var(--bg-elev))"
          />
          {aspects!.map((asp, i) => {
            if (asp.type === AspectType.Conjunction) return null;
            const color = ASPECT_COLORS[asp.type] ?? "var(--muted-foreground)";
            const isMajor = MAJOR_ASPECTS.has(asp.type);
            const [x1, y1] = deg2xy(asp.aLng, g.rAspect);
            const [x2, y2] = deg2xy(asp.bLng, g.rAspect);
            return (
              <line
                key={`asp-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={isMajor ? 1 : 0.6}
                strokeDasharray={isMajor ? undefined : "2 2"}
                opacity={isMajor ? 0.7 : 0.45}
              />
            );
          })}
          <circle
            cx={g.cx}
            cy={g.cy}
            r={g.rAspect}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="0.75"
          />
        </g>
      )}

      {/* 8a. Leader ticks — short radial marks at each planet's true
            longitude, drawn on the inside edge of the zodiac ring. They
            anchor the displaced glyph back to its real position. Only
            visible when displacement actually happens. */}
      {showPlanetGlyphs &&
        positions.map(([lng], i) => {
          const delta = Math.abs(((displayLngs[i] - lng + 540) % 360) - 180);
          if (delta < 0.5) return null;
          const tickLen = Math.max(2, g.r * 0.018);
          const [x1, y1] = deg2xy(lng, g.rZodiacInner);
          const [x2, y2] = deg2xy(lng, g.rZodiacInner - tickLen);
          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--fg-dim)"
              strokeWidth={0.8}
              opacity={0.7}
            />
          );
        })}

      {/* 8b. Planets — dots at Tier S, glyphs at M/L. Position uses
            displacement-resolved angles so stelliums don't overlap. */}
      {positions.map(([lng, glyph], i) => {
        const dispLng = displayLngs[i] ?? lng;
        const [x, y] = deg2xy(dispLng, g.rPlanetCenter);
        const isRetro = retrograde?.[i] === true;
        const fill = isRetro ? "var(--destructive)" : "var(--fg)";
        if (!showPlanetGlyphs) {
          return (
            <circle
              key={`p-${i}`}
              cx={x}
              cy={y}
              r={planetDotR}
              fill={isRetro ? "var(--destructive)" : "var(--accent)"}
            />
          );
        }
        return (
          <text
            key={`p-${i}`}
            x={x}
            y={y}
            fontSize={planetFontSize}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill,
              fontFamily: GLYPH_FONT_FAMILY,
            }}
          >
            {glyph}
          </text>
        );
      })}
    </svg>
  );
}

export function toMiniWheelPositions(chart: ChartData): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  for (const body of PLANET_ORDER) {
    const pos = chart.positions[body];
    if (!pos) continue;
    const glyph = PLANET_GLYPHS[body];
    if (!glyph) continue;
    out.push([pos.longitude, glyph]);
  }
  return out;
}

function toMiniWheelRetrograde(chart: ChartData): boolean[] {
  const out: boolean[] = [];
  for (const body of PLANET_ORDER) {
    const pos = chart.positions[body];
    if (!pos) continue;
    const glyph = PLANET_GLYPHS[body];
    if (!glyph) continue;
    const zp = chart.zodiac_positions[body];
    out.push(zp?.is_retrograde === true);
  }
  return out;
}

function toMiniWheelAspects(chart: ChartData): MiniWheelAspect[] {
  const out: MiniWheelAspect[] = [];
  for (const a of chart.aspects) {
    const p1 = chart.positions[a.body1];
    const p2 = chart.positions[a.body2];
    if (!p1 || !p2) continue;
    out.push({ aLng: p1.longitude, bLng: p2.longitude, type: a.type });
  }
  return out;
}

export function toMiniWheelProps(
  chart: ChartData,
  opts: { size: number; variant?: MiniWheelVariant },
): MiniWheelProps {
  return {
    size: opts.size,
    variant: opts.variant,
    positions: toMiniWheelPositions(chart),
    retrograde: toMiniWheelRetrograde(chart),
    ascDeg: chart.houses.ascendant,
    houses: {
      ascendant: chart.houses.ascendant,
      descendant: chart.houses.descendant,
      midheaven: chart.houses.midheaven,
      imum_coeli: chart.houses.imum_coeli,
      cusps: chart.houses.cusps,
    },
    aspects: toMiniWheelAspects(chart),
  };
}
