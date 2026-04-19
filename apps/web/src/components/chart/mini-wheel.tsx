import { useId } from "react";
import type { JSX } from "react";
import type { ChartData } from "@astro-app/shared-types";
import { CelestialBody } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";

export type MiniWheelVariant = "compact" | "featured";

export interface MiniWheelProps {
  size: number;
  positions: Array<[number, string]>;
  ascDeg: number;
  variant?: MiniWheelVariant;
  className?: string;
}

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
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

export function MiniWheel({
  size,
  positions,
  ascDeg,
  variant = "compact",
  className,
}: MiniWheelProps): JSX.Element {
  const clipIdBase = useId();
  const clipId = `miniwheel-clip-${clipIdBase.replace(/:/g, "")}`;

  const r = size / 2;
  const cx = r;
  const cy = r;
  const rOuter = r - 1;
  const rSigns = r - (variant === "featured" ? 22 : 10);
  const rInner = r - (variant === "featured" ? 42 : 18);

  const deg2xy = (deg: number, radius: number): [number, number] => {
    const a = ((deg - ascDeg + 180) * Math.PI) / 180;
    return [cx - Math.cos(a) * radius, cy - Math.sin(a) * radius];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} style={{ display: "block" }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={rOuter} />
        </clipPath>
      </defs>

      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="var(--border)" strokeWidth="0.75" />
      <circle cx={cx} cy={cy} r={rSigns} fill="none" stroke="var(--border)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--border-strong)" strokeWidth="0.5" />

      {Array.from({ length: 12 }).map((_, i) => {
        const d = i * 30;
        const [x1, y1] = deg2xy(d, rSigns);
        const [x2, y2] = deg2xy(d, rOuter);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--border)"
            strokeWidth="0.5"
          />
        );
      })}

      {variant === "featured" &&
        Array.from({ length: 12 }).map((_, i) => {
          const mid = i * 30 + 15;
          const [x, y] = deg2xy(mid, (rSigns + rOuter) / 2);
          return (
            <text
              key={i}
              x={x}
              y={y}
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: `var(--${SIGN_ELEMENTS[i]})`,
                fontFamily: "'Noto Sans Symbols 2', sans-serif",
              }}
            >
              {SIGN_GLYPHS[i]}
            </text>
          );
        })}

      {variant === "featured" && (
        <>
          <line
            x1={cx - rOuter}
            y1={cy}
            x2={cx + rOuter}
            y2={cy}
            stroke="var(--border-strong)"
            strokeWidth="0.75"
          />
          <line
            x1={cx}
            y1={cy - rOuter}
            x2={cx}
            y2={cy + rOuter}
            stroke="var(--border-strong)"
            strokeWidth="0.75"
          />
          <text
            x={cx - rOuter + 5}
            y={cy - 3}
            fontSize="7"
            style={{
              fill: "var(--fg-dim)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            ASC
          </text>
          <text
            x={cx + 3}
            y={cy - rOuter + 9}
            fontSize="7"
            style={{
              fill: "var(--fg-dim)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
            }}
          >
            MC
          </text>
        </>
      )}

      {variant === "featured" &&
        positions.slice(0, 6).map(([lngA], i) =>
          positions.slice(i + 1, i + 3).map(([lngB], j) => {
            const [x1, y1] = deg2xy(lngA, rInner - 2);
            const [x2, y2] = deg2xy(lngB, rInner - 2);
            return (
              <line
                key={`asp-${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--accent)"
                strokeWidth="0.4"
                opacity="0.4"
              />
            );
          }),
        )}

      {positions.map(([lng, g], i) => {
        const [x, y] = deg2xy(lng, (rSigns + rInner) / 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={variant === "featured" ? 1.4 : 1} fill="var(--accent)" />
            <text
              x={x}
              y={y + 0.5}
              fontSize={variant === "featured" ? 9 : 6.5}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: "var(--fg)",
                fontFamily: "'Noto Sans Symbols 2', sans-serif",
                transform: `translateY(-${variant === "featured" ? 8 : 5}px)`,
                transformOrigin: `${x}px ${y}px`,
              }}
            >
              {g}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="1" fill="var(--fg-dim)" />
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

export function toMiniWheelProps(
  chart: ChartData,
  opts: { size: number; variant?: MiniWheelVariant },
): MiniWheelProps {
  return {
    size: opts.size,
    variant: opts.variant,
    positions: toMiniWheelPositions(chart),
    ascDeg: chart.houses.ascendant,
  };
}
