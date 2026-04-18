import { useState } from "react";
import { calculateApproximate, moonPhaseAngle, findNearestPhaseDate } from "@astro-app/approx-engine";
import { CelestialBody, Element, SIGN_ORDER, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ZodiacSign } from "@astro-app/shared-types";
import { getMoonPhaseName, SIGN_GLYPHS, formatDegree, formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

function UpcomingPhasesList({
  phases,
  timeFormat,
  now,
}: {
  phases: PhaseEvent[];
  timeFormat: "12h" | "24h";
  now: Date;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[12px]">
      {phases.slice(0, 4).map((row, i) => {
        const color = ELEMENT_COLORS[SIGN_ELEMENT[row.sign]];
        const hoursUntil =
          (row.date.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isNear = hoursUntil >= 0 && hoursUntil < 12;
        return (
          <div
            key={i}
            className="grid items-center gap-2 whitespace-nowrap"
            style={{ gridTemplateColumns: "42px 1fr auto" }}
          >
            <div className="text-muted-foreground flex items-center">
              {isNear && (
                <span className="inline-block w-1 h-1 rounded-full bg-primary mr-1" />
              )}
              {row.label}
            </div>
            <div className="mono text-dim-foreground overflow-hidden text-ellipsis">
              {formatTableDate(row.date)} · {formatTime(row.date, timeFormat)}
            </div>
            <div className="text-right">
              <span style={{ color }}>{SIGN_GLYPHS[row.sign]}</span>
              <span className="text-muted-foreground tabular-nums ml-1">
                {row.degree}°{row.minute.toString().padStart(2, "0")}′
              </span>
            </div>
          </div>
        );
      })}
    </div>
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

  const illumination = Math.round(
    ((1 - Math.cos((elongation * Math.PI) / 180)) / 2) * 100,
  );

  const moonSignColor = moonZp
    ? ELEMENT_COLORS[SIGN_ELEMENT[moonZp.sign]]
    : undefined;
  const moonSignName = moonZp
    ? moonZp.sign.charAt(0).toUpperCase() + moonZp.sign.slice(1).toLowerCase()
    : "";
  const nextSignIdx = moonZp
    ? (SIGN_ORDER.indexOf(moonZp.sign) + 1) % 12
    : -1;
  const nextSign = nextSignIdx >= 0 ? SIGN_ORDER[nextSignIdx]! : null;
  const nextSignGlyph = nextSign ? SIGN_GLYPHS[nextSign] : null;

  return (
    <Card className="card-moon card-hover animate-fade-in py-0">
      <CardContent className="p-pad">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="card-title">Moon</div>
          <span className="mono inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground tabular-nums">
            {illumination}% lit
          </span>
        </div>

        {/* Main row: ring + phase info */}
        <div className="flex items-center gap-[18px] animate-fade-in">
          <span
            className="leading-none shrink-0 text-[44px]"
            aria-hidden
            title={phaseName}
          >
            {phaseIcon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-display text-foreground text-[22px] leading-tight">
              {phaseName}
            </div>
            {moonZp && (
              <div className="text-[13px] text-muted-foreground mt-1">
                <span style={{ color: moonSignColor }}>
                  {SIGN_GLYPHS[moonZp.sign]}
                </span>{" "}
                {formatDegree(moonZp.degree, moonZp.minute)}
                <span className="ml-1">in {moonSignName}</span>
              </div>
            )}
            {ingressStr && nextSignGlyph && (
              <div className="text-[12px] text-dim-foreground mt-1">
                ingress {ingressStr} → <span>{nextSignGlyph}</span>
              </div>
            )}
          </div>
          <MoonCycleRing progress={progress} size={76} />
        </div>

        <Separator className="my-3.5" />

        {/* Upcoming phases */}
        <UpcomingPhasesList phases={phases} timeFormat={timeFormat} now={now} />
      </CardContent>
    </Card>
  );
}
