import { useState } from "react";
import { calculateApproximate, moonPhaseAngle, findNearestPhaseDate } from "@astro-app/approx-engine";
import { CelestialBody, Element, SIGN_ORDER, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ZodiacSign } from "@astro-app/shared-types";
import { getMoonPhaseName, SIGN_GLYPHS, formatDegree, formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";

const PHASE_ICONS: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};

interface PhaseEvent {
  label: string;
  date: Date;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  isPast: boolean;
}

function computePhaseTable(now: Date): PhaseEvent[] {
  const phases = [
    { label: "New", target: 0 },
    { label: "1st Q", target: 90 },
    { label: "Full", target: 180 },
    { label: "3rd Q", target: 270 },
  ] as const;

  const future: PhaseEvent[] = [];

  for (const { label, target } of phases) {
    const date = findNearestPhaseDate(now, target, "future");
    const approx = calculateApproximate(date, 0, 0);
    const moonZp = approx.zodiac_positions[CelestialBody.Moon];
    if (!moonZp) continue;
    future.push({
      label,
      date,
      sign: moonZp.sign,
      degree: moonZp.degree,
      minute: moonZp.minute,
      isPast: false,
    });
  }

  future.sort((a, b) => a.date.getTime() - b.date.getTime());
  return future.slice(0, 5);
}

function formatTableDate(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function PhaseTable({
  phases,
  timeFormat,
  now,
}: {
  phases: PhaseEvent[];
  timeFormat: "12h" | "24h";
  now: Date;
}) {
  return (
    <table className="text-xs border-separate border-spacing-x-1 border-spacing-y-0.5">
      <tbody>
        {phases.map((row, i) => {
          const color = ELEMENT_COLORS[SIGN_ELEMENT[row.sign]];
          const hoursUntil = (row.date.getTime() - now.getTime()) / (1000 * 60 * 60);
          const isNear = hoursUntil >= 0 && hoursUntil < 12;
          return (
            <tr key={i}>
              <td className="whitespace-nowrap pr-1">
                {isNear && (
                  <span className="inline-block w-1 h-1 rounded-full bg-primary mr-1 align-middle mb-px" />
                )}
                <span className="text-muted-foreground">{row.label}</span>
              </td>
              <td className="text-foreground whitespace-nowrap">{formatTableDate(row.date)}</td>
              <td className="text-foreground whitespace-nowrap">{formatTime(row.date, timeFormat)}</td>
              <td className="whitespace-nowrap tabular-nums">
                <span className="text-foreground">{row.degree.toString().padStart(2, "0")}</span>
                <span style={{ color }}>{SIGN_GLYPHS[row.sign]}</span>
                <span className="text-foreground">{row.minute.toString().padStart(2, "0")}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** SVG circular moon phase tracker. New moon at top (12 o'clock), full at bottom. */
function MoonCycleRing({ progress, size = 80 }: { progress: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 21;
  const strokeWidth = 3;

  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * progress;

  const markerAngle = progress * 360;
  const markerRad = ((markerAngle - 90) * Math.PI) / 180;
  const markerX = cx + r * Math.cos(markerRad);
  const markerY = cy + r * Math.sin(markerRad);

  const labelR = r + 14;
  const emojiLabels = [
    { emoji: "🌑", angle: -90 },
    { emoji: "🌓", angle: 0 },
    { emoji: "🌕", angle: 90 },
    { emoji: "🌗", angle: 180 },
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      {/* Progress arc — lunar silver */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#D0D4E0"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeDashoffset={circumference * 0.25}
      />
      {emojiLabels.map(({ emoji, angle }) => {
        const rad = (angle * Math.PI) / 180;
        const x = cx + labelR * Math.cos(rad);
        const y = cy + labelR * Math.sin(rad);
        return (
          <text
            key={angle}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fontFamily="'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"
          >
            {emoji}
          </text>
        );
      })}
      {/* Marker — two-tone dot */}
      <circle cx={markerX} cy={markerY} r={5} fill="#D0D4E0" />
      <circle cx={markerX} cy={markerY} r={2} fill="white" />
    </svg>
  );
}

export function MoonCard() {
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const [now] = useState(() => new Date());
  const [elongation] = useState(() => moonPhaseAngle(now));
  const [phases] = useState(() => computePhaseTable(now));
  const [{ moonZp, moonSpeed }] = useState(() => {
    const approx = calculateApproximate(now, 0, 0);
    return {
      moonZp: approx.zodiac_positions[CelestialBody.Moon],
      moonSpeed: approx.positions[CelestialBody.Moon]?.speed_longitude ?? 13,
    };
  });

  const phaseName = getMoonPhaseName(elongation);
  const phaseIcon = PHASE_ICONS[phaseName] ?? "🌙";
  const progress = elongation / 360;

  const degreesInSign = moonZp ? 30 - (moonZp.degree + moonZp.minute / 60) : 0;
  const hoursToIngress = moonSpeed > 0 ? (degreesInSign / moonSpeed) * 24 : null;
  const ingressStr =
    hoursToIngress !== null
      ? hoursToIngress < 1
        ? "< 1h"
        : `~${Math.round(hoursToIngress)}h`
      : null;

  const nextSignGlyph = moonZp
    ? SIGN_GLYPHS[SIGN_ORDER[(SIGN_ORDER.indexOf(moonZp.sign) + 1) % 12]!]
    : null;

  return (
    <Card className="card-moon card-hover animate-fade-in py-0">
      <CardContent className="px-0 p-phi-4">
        <div className="flex flex-wrap items-center justify-between gap-phi-3">
        {/* Phase info */}
        <div
          className="flex items-center gap-phi-2 shrink-0 min-w-0 animate-fade-in"
          style={{ animationDelay: "0ms" }}
        >
          <span className="leading-none shrink-0" style={{ fontSize: "var(--text-phi-h1)" }}>
            {phaseIcon}
          </span>
          <div>
            <p className="text-foreground font-semibold text-base font-display tracking-tight">
              {phaseName}
            </p>
            {moonZp && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {SIGN_GLYPHS[moonZp.sign]} {formatDegree(moonZp.degree, moonZp.minute)}
              </p>
            )}
            {ingressStr && nextSignGlyph && (
              <p className="text-muted-foreground text-xs mt-0.5">
                {ingressStr} → {nextSignGlyph}
              </p>
            )}
          </div>
        </div>

        {/* Upcoming phases table */}
        <div className="animate-fade-in" style={{ animationDelay: "60ms" }}>
          <PhaseTable phases={phases} timeFormat={timeFormat} now={now} />
        </div>

        {/* Circular phase tracker */}
        <div className="shrink-0 animate-fade-in" style={{ animationDelay: "120ms" }}>
          <MoonCycleRing progress={progress} size={89} />
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
