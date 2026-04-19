import { useMemo, useState, useEffect, useRef, memo } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { CelestialBody, AspectType } from "@astro-app/shared-types";
import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/format";
import {
  orbIntensity,
  orbAtTime,
  refinePeakTime,
  findOrbCrossing,
  findLocalMaxIndices,
  GOLDEN_R,
  CONVERGENCE_MS,
  MAX_ITER,
} from "./aspects-timeline-utils";
import { useSettings } from "@/hooks/use-settings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_COUNT = 10;
const DAY_OFFSET = -2;
const SAMPLES_PER_DAY = 12;
const TOTAL_SAMPLES = DAY_COUNT * SAMPLES_PER_DAY;

const VIEWBOX_W = 1000;
const TOP_PAD = 32;
const BOTTOM_PAD = 26;
const ROW_HEIGHT = 20;
const LEFT_PAD = 56;

/**
 * Ordered slowest-to-fastest by apparent motion. Decides which body is "group"
 * and which is "other" in an aspect pair — slower body wins (smaller index),
 * keeping the glyph trio consistent across renders (e.g. always `☉☌☽`, never
 * `☽☌☉`). Every body that `calculateApproximate` produces aspects for is
 * included, so the timeline surfaces Moon/Sun/Mercury/Venus aspects too — not
 * just slow-planet transits.
 */
const GROUP_PLANETS: CelestialBody[] = [
  CelestialBody.Pluto,
  CelestialBody.Neptune,
  CelestialBody.Uranus,
  CelestialBody.Chiron,
  CelestialBody.Saturn,
  CelestialBody.Jupiter,
  CelestialBody.Mars,
  CelestialBody.Sun,
  CelestialBody.Venus,
  CelestialBody.Mercury,
  CelestialBody.Moon,
];

const ASPECT_COLORS: Partial<Record<AspectType, string>> = {
  [AspectType.Conjunction]: "var(--aspect-conjunction)",
  [AspectType.Sextile]: "var(--aspect-sextile)",
  [AspectType.Square]: "var(--aspect-square)",
  [AspectType.Trine]: "var(--aspect-trine)",
  [AspectType.Opposition]: "var(--aspect-opposition)",
  [AspectType.Quincunx]: "var(--aspect-quincunx)",
  // Minor-aspect palette — subtler than the majors; all in the muted violet
  // family so they read as a cohesive group distinct from the major card.
  [AspectType.SemiSextile]: "var(--aspect-quincunx)",
  [AspectType.SemiSquare]: "var(--aspect-square)",
  [AspectType.Sesquisquare]: "var(--aspect-square)",
  [AspectType.Quintile]: "var(--aspect-trine)",
  [AspectType.BiQuintile]: "var(--aspect-trine)",
};

const DEFAULT_MAX_ORB: Partial<Record<AspectType, number>> = {
  [AspectType.Conjunction]: 8,
  [AspectType.Opposition]: 8,
  [AspectType.Trine]: 8,
  [AspectType.Square]: 8,
  [AspectType.Sextile]: 4,
  [AspectType.Quincunx]: 2,
  [AspectType.SemiSextile]: 2,
  [AspectType.SemiSquare]: 2,
  [AspectType.Sesquisquare]: 2,
  [AspectType.Quintile]: 2,
  [AspectType.BiQuintile]: 2,
};

const SETTINGS_KEY_TO_ASPECT: Record<string, AspectType> = {
  conjunction: AspectType.Conjunction,
  opposition: AspectType.Opposition,
  trine: AspectType.Trine,
  square: AspectType.Square,
  sextile: AspectType.Sextile,
  quincunx: AspectType.Quincunx,
  semi_sextile: AspectType.SemiSextile,
  semi_square: AspectType.SemiSquare,
  sesquiquadrate: AspectType.Sesquisquare,
};

const ASPECT_ANGLES: Record<AspectType, number> = {
  [AspectType.Conjunction]: 0,
  [AspectType.Opposition]: 180,
  [AspectType.Trine]: 120,
  [AspectType.Square]: 90,
  [AspectType.Sextile]: 60,
  [AspectType.Quincunx]: 150,
  [AspectType.SemiSextile]: 30,
  [AspectType.SemiSquare]: 45,
  [AspectType.Sesquisquare]: 135,
  [AspectType.Quintile]: 72,
  [AspectType.BiQuintile]: 144,
};

const ASPECT_NAMES: Record<AspectType, string> = {
  [AspectType.Conjunction]: "Conjunction",
  [AspectType.Opposition]: "Opposition",
  [AspectType.Trine]: "Trine",
  [AspectType.Square]: "Square",
  [AspectType.Sextile]: "Sextile",
  [AspectType.Quincunx]: "Quincunx",
  [AspectType.SemiSextile]: "Semi-Sextile",
  [AspectType.SemiSquare]: "Semi-Square",
  [AspectType.Sesquisquare]: "Sesquisquare",
  [AspectType.Quintile]: "Quintile",
  [AspectType.BiQuintile]: "Bi-Quintile",
};

const MAJOR_ASPECTS: Set<AspectType> = new Set([
  AspectType.Conjunction,
  AspectType.Opposition,
  AspectType.Trine,
  AspectType.Square,
  AspectType.Sextile,
]);

const MINOR_ASPECTS: Set<AspectType> = new Set([
  AspectType.SemiSextile,
  AspectType.SemiSquare,
  AspectType.Quincunx,
  AspectType.Sesquisquare,
  AspectType.Quintile,
  AspectType.BiQuintile,
]);

type AspectsTimelineVariant = "major" | "minor";

const SAMPLE_MS = (24 / SAMPLES_PER_DAY) * 3600 * 1000;

function formatMs(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildMaxOrbMap(
  settingsOrbs: Record<string, number>,
): Partial<Record<AspectType, number>> {
  const map = { ...DEFAULT_MAX_ORB };
  for (const [key, value] of Object.entries(settingsOrbs)) {
    const aspectType = SETTINGS_KEY_TO_ASPECT[key];
    if (aspectType) map[aspectType] = value;
  }
  return map;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AspectBar {
  groupPlanet: CelestialBody;
  otherPlanet: CelestialBody;
  aspectType: AspectType;
  /** Intensity [0, 1] at each of TOTAL_SAMPLES sample points (every 6 h) */
  samples: number[];
}

// ─── Data computation ─────────────────────────────────────────────────────────

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

async function computeAspectBarsAsync(
  today: Date,
  orbOverrides: Record<string, number>,
  includeMinor: boolean,
  maxOrbMap: Partial<Record<AspectType, number>>,
  signal: AbortSignal,
): Promise<AspectBar[]> {
  const sampleMaps: Map<string, number>[] = [];

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    if (signal.aborted) return [];

    const dayIndex = Math.floor(i / SAMPLES_PER_DAY);
    const hourIndex = i % SAMPLES_PER_DAY;

    const d = new Date(today);
    d.setDate(d.getDate() + DAY_OFFSET + dayIndex);
    d.setHours(hourIndex * (24 / SAMPLES_PER_DAY), 0, 0, 0);

    const chart = calculateApproximate(d, 0, 0, { orbOverrides, includeMinor });
    const intensityMap = new Map<string, number>();

    for (const aspect of chart.aspects) {
      const b1Idx = GROUP_PLANETS.indexOf(aspect.body1 as CelestialBody);
      const b2Idx = GROUP_PLANETS.indexOf(aspect.body2 as CelestialBody);

      let groupPlanet: CelestialBody | null = null;
      let otherPlanet: CelestialBody | null = null;

      if (b1Idx !== -1 && b2Idx !== -1) {
        if (b1Idx < b2Idx) {
          groupPlanet = aspect.body1 as CelestialBody;
          otherPlanet = aspect.body2 as CelestialBody;
        } else {
          groupPlanet = aspect.body2 as CelestialBody;
          otherPlanet = aspect.body1 as CelestialBody;
        }
      } else if (b1Idx !== -1) {
        groupPlanet = aspect.body1 as CelestialBody;
        otherPlanet = aspect.body2 as CelestialBody;
      } else if (b2Idx !== -1) {
        groupPlanet = aspect.body2 as CelestialBody;
        otherPlanet = aspect.body1 as CelestialBody;
      }

      if (!groupPlanet || !otherPlanet) continue;

      const maxOrb = maxOrbMap[aspect.type as AspectType] ?? 8;
      const intensity = orbIntensity(aspect.orb, maxOrb);
      const key = `${groupPlanet}|${aspect.type}|${otherPlanet}`;
      intensityMap.set(key, intensity);
    }

    sampleMaps.push(intensityMap);
    await yieldToMain();
  }

  if (signal.aborted) return [];

  const allKeys = new Set<string>();
  sampleMaps.forEach((m) => m.forEach((_, k) => allKeys.add(k)));

  const bars: AspectBar[] = [];
  for (const key of allKeys) {
    const [groupStr, typeStr, otherStr] = key.split("|");
    if (!groupStr || !typeStr || !otherStr) continue;

    const samples = sampleMaps.map((m) => m.get(key) ?? 0);
    if (samples.every((v) => v === 0)) continue;

    bars.push({
      groupPlanet: groupStr as CelestialBody,
      otherPlanet: otherStr as CelestialBody,
      aspectType: typeStr as AspectType,
      samples,
    });
  }

  return bars;
}

// ─── Per-bar range extraction ─────────────────────────────────────────────────

interface BarRange {
  bar: AspectBar;
  startMs: number;
  endMs: number;
  peaks: Array<{ ms: number; value: number }>;
  startClipped: boolean;
  endClipped: boolean;
}

/**
 * Golden-section MAXIMIZATION of orbAtTime(t) in [aMs, bMs].
 * Used to detect whether the aspect exits orb between two local peaks.
 */
function localOrbMax(
  aMs: number,
  bMs: number,
  body1: CelestialBody,
  body2: CelestialBody,
  aspectAngle: number,
): number {
  let a = aMs, b = bMs;
  let x1 = a + (1 - GOLDEN_R) * (b - a);
  let x2 = a + GOLDEN_R * (b - a);
  let f1 = orbAtTime(x1, body1, body2, aspectAngle);
  let f2 = orbAtTime(x2, body1, body2, aspectAngle);
  for (let i = 0; i < MAX_ITER; i++) {
    if (b - a < CONVERGENCE_MS) break;
    if (f1 < f2) {
      a = x1; x1 = x2; f1 = f2;
      x2 = a + GOLDEN_R * (b - a);
      f2 = orbAtTime(x2, body1, body2, aspectAngle);
    } else {
      b = x2; x2 = x1; f2 = f1;
      x1 = a + (1 - GOLDEN_R) * (b - a);
      f1 = orbAtTime(x1, body1, body2, aspectAngle);
    }
  }
  return orbAtTime((a + b) / 2, body1, body2, aspectAngle);
}

function computeRanges(
  bar: AspectBar,
  windowStartMs: number,
  maxOrbMap: Partial<Record<AspectType, number>>,
): BarRange[] {
  const maxOrb = maxOrbMap[bar.aspectType] ?? 8;
  const aspectAngle = ASPECT_ANGLES[bar.aspectType] ?? 0;

  const candidates = findLocalMaxIndices(bar.samples);
  if (candidates.length === 0) return [];

  // Refine each candidate to a precise peak.
  type RefinedPeak = { ms: number; orb: number; sampleIdx: number };
  const refined: RefinedPeak[] = [];
  for (const idx of candidates) {
    const bracketStart =
      windowStartMs + Math.max(0, idx - 1) * SAMPLE_MS;
    const bracketEnd =
      windowStartMs + Math.min(bar.samples.length - 1, idx + 1) * SAMPLE_MS;
    const p = refinePeakTime(
      bracketStart,
      bracketEnd,
      bar.groupPlanet,
      bar.otherPlanet,
      aspectAngle,
    );
    if (p.orb < maxOrb) refined.push({ ms: p.ms, orb: p.orb, sampleIdx: idx });
  }
  if (refined.length === 0) return [];
  refined.sort((a, b) => a.ms - b.ms);

  // Partition into continuous-window groups.
  const groups: RefinedPeak[][] = [[refined[0]!]];
  for (let i = 1; i < refined.length; i++) {
    const prev = refined[i - 1]!;
    const curr = refined[i]!;
    const maxBetween = localOrbMax(
      prev.ms,
      curr.ms,
      bar.groupPlanet,
      bar.otherPlanet,
      aspectAngle,
    );
    if (maxBetween >= maxOrb) {
      groups.push([curr]);
    } else {
      groups[groups.length - 1]!.push(curr);
    }
  }

  // Emit one BarRange per group.
  const out: BarRange[] = [];
  for (const group of groups) {
    const first = group[0]!;
    const last = group[group.length - 1]!;

    // Left outer bracket: last zero before first peak's sample, else window start.
    let leftIdx = -1;
    for (let i = first.sampleIdx - 1; i >= 0; i--) {
      if (bar.samples[i]! === 0) { leftIdx = i; break; }
    }
    const leftOuterMs =
      leftIdx >= 0 ? windowStartMs + leftIdx * SAMPLE_MS : windowStartMs;

    // Right outer bracket: first zero after last peak's sample, else window end.
    let rightIdx = -1;
    for (let i = last.sampleIdx + 1; i < bar.samples.length; i++) {
      if (bar.samples[i]! === 0) { rightIdx = i; break; }
    }
    const rightOuterMs =
      rightIdx >= 0
        ? windowStartMs + rightIdx * SAMPLE_MS
        : windowStartMs + (bar.samples.length - 1) * SAMPLE_MS;

    const start = findOrbCrossing(
      "left",
      first.ms,
      first.orb,
      leftOuterMs,
      maxOrb,
      bar.groupPlanet,
      bar.otherPlanet,
      aspectAngle,
    );
    const end = findOrbCrossing(
      "right",
      last.ms,
      last.orb,
      rightOuterMs,
      maxOrb,
      bar.groupPlanet,
      bar.otherPlanet,
      aspectAngle,
    );

    out.push({
      bar,
      startMs: start.ms,
      endMs: end.ms,
      peaks: group.map((p) => ({ ms: p.ms, value: 1 - p.orb / maxOrb })),
      startClipped: start.clipped,
      endClipped: end.clipped,
    });
  }

  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AspectsTimelineProps {
  variant?: AspectsTimelineVariant;
}

export const AspectsTimeline = memo(function AspectsTimeline({
  variant = "major",
}: AspectsTimelineProps = {}) {
  const aspectSettings = useSettings((s) => s.aspects);
  const isMinor = variant === "minor";
  const title = isMinor ? "10-Day Minor Aspects" : "10-Day Major Aspects";
  const includeMinor = isMinor ? true : aspectSettings.showMinor;
  const emptyLabel = isMinor
    ? "No active minor aspects in this 10-day window."
    : null;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxOrbMap = useMemo(
    () => buildMaxOrbMap(aspectSettings.orbs),
    [aspectSettings.orbs],
  );

  const days = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + DAY_OFFSET + i);
        return d;
      }),
    [today],
  );

  const [bars, setBars] = useState<AspectBar[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const id = requestAnimationFrame(() => {
      void computeAspectBarsAsync(
        today,
        aspectSettings.orbs,
        includeMinor,
        maxOrbMap,
        controller.signal,
      ).then((result) => {
        if (!controller.signal.aborted) setBars(result);
      });
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [today, aspectSettings, maxOrbMap, includeMinor]);

  const windowStartMs = today.getTime() + DAY_OFFSET * 24 * 3600 * 1000;
  const windowDurationMs = DAY_COUNT * 24 * 3600 * 1000;
  const windowEndMs = windowStartMs + windowDurationMs;

  const [ranges, setRanges] = useState<BarRange[]>([]);
  const rangesAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    rangesAbortRef.current?.abort();
    const controller = new AbortController();
    rangesAbortRef.current = controller;

    void (async () => {
      const filter = isMinor ? MINOR_ASPECTS : MAJOR_ASPECTS;
      const list: BarRange[] = [];
      for (const bar of bars) {
        if (controller.signal.aborted) return;
        if (!filter.has(bar.aspectType)) continue;
        const rs = computeRanges(bar, windowStartMs, maxOrbMap);
        for (const r of rs) {
          if (r.endMs < windowStartMs || r.startMs > windowEndMs) continue;
          list.push(r);
        }
        await yieldToMain();
      }
      if (controller.signal.aborted) return;
      list.sort((a, b) => {
        const aFirst = a.peaks[0]!.ms;
        const bFirst = b.peaks[0]!.ms;
        if (aFirst !== bFirst) return aFirst - bFirst;
        return b.peaks[0]!.value - a.peaks[0]!.value;
      });
      if (!controller.signal.aborted) setRanges(list);
    })();

    return () => {
      controller.abort();
    };
  }, [bars, isMinor, windowStartMs, windowEndMs, maxOrbMap]);

  const todayIdx = -DAY_OFFSET;
  const dayW = VIEWBOX_W / DAY_COUNT;
  const height = TOP_PAD + Math.max(ranges.length, 6) * ROW_HEIGHT + BOTTOM_PAD;

  const msToX = (ms: number) =>
    ((ms - windowStartMs) / windowDurationMs) * VIEWBOX_W;

  const clampX = (x: number) => Math.max(0, Math.min(VIEWBOX_W, x));

  // Current moment within the 10-day window, expressed in viewBox x.
  // Used to draw a thin accent line at "now" so the user can distinguish
  // "happened earlier today" (peak left of NOW) from "coming up" (peak right).
  const nowProgress = (Date.now() - windowStartMs) / windowDurationMs;
  const nowX =
    nowProgress >= 0 && nowProgress <= 1
      ? nowProgress * VIEWBOX_W
      : null;

  const isLoading = bars.length === 0;

  return (
    <div className="bg-card border border-border rounded-lg p-pad card-hover">
      <div className="flex items-baseline justify-between mb-3.5">
        <div className="card-title">{title}</div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`${-LEFT_PAD} 0 ${VIEWBOX_W + LEFT_PAD} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          {/* Day gridlines: solid at both edges of today's slot, dashed elsewhere */}
          {Array.from({ length: DAY_COUNT + 1 }).map((_, i) => {
            const x = i * dayW;
            const isTodayEdge = i === todayIdx || i === todayIdx + 1;
            return (
              <line
                key={`grid-${i}`}
                x1={x}
                y1={TOP_PAD - 10}
                x2={x}
                y2={height - BOTTOM_PAD + 4}
                stroke="var(--border)"
                strokeWidth={isTodayEdge ? 1.2 : 0.6}
                strokeDasharray={isTodayEdge ? "" : "2,4"}
                opacity={isTodayEdge ? 0.9 : 0.55}
              />
            );
          })}

          {/* NOW marker — label + thin dotted accent line at the current moment */}
          {nowX !== null && (
            <>
              <text
                x={nowX}
                y={16}
                fontSize="10"
                fill="var(--primary)"
                letterSpacing="0.15em"
                fontWeight="500"
                textAnchor="middle"
              >
                NOW
              </text>
              <line
                x1={nowX}
                y1={TOP_PAD - 10}
                x2={nowX}
                y2={height - BOTTOM_PAD + 4}
                stroke="var(--primary)"
                strokeWidth={1}
                strokeDasharray="1,3"
                opacity={0.5}
              />
            </>
          )}

          {/* Aspect bars */}
          {ranges.map((r, idx) => {
            const y = TOP_PAD + idx * ROW_HEIGHT;
            const rawX1 = msToX(r.startMs);
            const rawX2 = msToX(r.endMs);
            const x1 = clampX(rawX1);
            const x2 = clampX(rawX2);
            const color =
              ASPECT_COLORS[r.bar.aspectType] ?? "var(--muted-foreground)";
            const pG = PLANET_GLYPHS[r.bar.groupPlanet] ?? "·";
            const aG = ASPECT_GLYPHS[r.bar.aspectType] ?? "·";
            const oG = PLANET_GLYPHS[r.bar.otherPlanet] ?? "·";
            const aspectName = ASPECT_NAMES[r.bar.aspectType] ?? r.bar.aspectType;
            const hitX = Math.min(x1, x2) - 2;
            const hitW = Math.abs(x2 - x1) + 4;
            const startLabel = r.startClipped
              ? `before ${formatMs(windowStartMs)}`
              : formatMs(r.startMs);
            const endLabel = r.endClipped
              ? `after ${formatMs(windowEndMs)}`
              : formatMs(r.endMs);
            return (
              <Tooltip key={`bar-${idx}`}>
                <TooltipTrigger
                  render={
                    <g>
                      <rect
                        x={hitX}
                        y={y - ROW_HEIGHT / 2}
                        width={hitW}
                        height={ROW_HEIGHT}
                        fill="transparent"
                        pointerEvents="all"
                      />
                      <line
                        x1={x1}
                        y1={y}
                        x2={x2}
                        y2={y}
                        stroke={color}
                        strokeWidth={1.5}
                        opacity={0.38}
                        strokeLinecap="round"
                      />
                      {r.peaks.map((p, pi) => (
                        <circle
                          key={`peak-${idx}-${pi}`}
                          cx={clampX(msToX(p.ms))}
                          cy={y}
                          r={3}
                          fill={color}
                        />
                      ))}
                      <text
                        x={x1 - 6}
                        y={y + 3}
                        fontSize={10}
                        textAnchor="end"
                        fill="var(--muted-foreground)"
                        fontFamily="'Noto Sans Symbols 2', 'Noto Sans Symbols', sans-serif"
                      >
                        <tspan>{pG}</tspan>
                        <tspan style={{ fill: color }}>{aG}</tspan>
                        <tspan>{oG}</tspan>
                      </text>
                    </g>
                  }
                />
                <TooltipContent
                  side="top"
                  className="flex-col items-start gap-1 py-2 text-[11px] leading-tight"
                >
                  <div className="font-medium text-[12px]">
                    <span>{pG}</span>
                    <span className="mx-1" style={{ color }}>
                      {aG}
                    </span>
                    <span>{oG}</span>
                    <span className="mx-1 opacity-60">·</span>
                    <span>{aspectName}</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 opacity-90">
                    <span className="opacity-60">Start</span>
                    <span className="font-mono">{startLabel}</span>
                    <span className="opacity-60 self-start">{r.peaks.length > 1 ? "Peaks" : "Peak"}</span>
                    <span className="font-mono flex flex-col">
                      {r.peaks.map((p, pi) => (
                        <span key={pi}>{formatMs(p.ms)}</span>
                      ))}
                    </span>
                    <span className="opacity-60">End</span>
                    <span className="font-mono">{endLabel}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Day labels at bottom */}
          {Array.from({ length: DAY_COUNT }).map((_, i) => {
            const x = i * dayW + dayW / 2;
            const date = days[i]!;
            const label = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const isToday = i === todayIdx;
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={height - 6}
                fontSize={9.5}
                textAnchor="middle"
                fill={isToday ? "var(--primary)" : "var(--faint-foreground)"}
                fontWeight={isToday ? 500 : 400}
              >
                {label}
              </text>
            );
          })}

          {isLoading && (
            <text
              x={VIEWBOX_W / 2}
              y={height / 2}
              fontSize={11}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              opacity={0.6}
            >
              Computing aspects…
            </text>
          )}

          {!isLoading && ranges.length === 0 && emptyLabel && (
            <text
              x={VIEWBOX_W / 2}
              y={height / 2}
              fontSize={11}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              opacity={0.7}
            >
              {emptyLabel}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
});
