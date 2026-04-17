import { useMemo, useState, useEffect, useRef, memo } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { CelestialBody, AspectType } from "@astro-app/shared-types";
import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/format";
import { orbIntensity, interpolatePeaks } from "./aspects-timeline-utils";
import { useSettings } from "@/hooks/use-settings";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DAY_COUNT = 10;
export const DAY_OFFSET = -2;
export const SAMPLES_PER_DAY = 4;
export const TOTAL_SAMPLES = DAY_COUNT * SAMPLES_PER_DAY;

const VIEWBOX_W = 1000;
const TOP_PAD = 32;
const BOTTOM_PAD = 26;
const ROW_HEIGHT = 20;
const LEFT_PAD = 56;

/**
 * Ordered slowest-to-fastest by apparent motion. Used to:
 *   1. Decide which body is "group" and which is "other" in an aspect pair —
 *      slower body wins (smaller index), keeping the glyph trio consistent
 *      across renders (e.g. always `☉☌☽`, never `☽☌☉`).
 *   2. Let the untracked shadcn-timeline variant iterate bars by group planet.
 *
 * Every body that `calculateApproximate` produces aspects for is included, so
 * the timeline surfaces Moon/Sun/Mercury/Venus aspects too — not just slow-
 * planet transits.
 */
export const GROUP_PLANETS: CelestialBody[] = [
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

/** Retained for the shadcn timeline variant (aspects-timeline-shadcn.tsx). */
export const GROUP_PLANET_NAMES: Partial<Record<CelestialBody, string>> = {
  [CelestialBody.Pluto]: "Pluto",
  [CelestialBody.Neptune]: "Neptune",
  [CelestialBody.Uranus]: "Uranus",
  [CelestialBody.Chiron]: "Chiron",
  [CelestialBody.Saturn]: "Saturn",
  [CelestialBody.Jupiter]: "Jupiter",
  [CelestialBody.Mars]: "Mars",
  [CelestialBody.Sun]: "Sun",
  [CelestialBody.Venus]: "Venus",
  [CelestialBody.Mercury]: "Mercury",
  [CelestialBody.Moon]: "Moon",
};

export const ASPECT_COLORS: Partial<Record<AspectType, string>> = {
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

export type AspectsTimelineVariant = "major" | "minor";

const ACTIVE_THRESHOLD = 0.05;

/** Max bars rendered — beyond this, the visual gets noisy. */
const MAX_BARS = 8;

export function buildMaxOrbMap(
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

export interface AspectBar {
  groupPlanet: CelestialBody;
  otherPlanet: CelestialBody;
  aspectType: AspectType;
  /** Intensity [0, 1] at each of TOTAL_SAMPLES sample points (every 6 h) */
  samples: number[];
}

// ─── Data computation ─────────────────────────────────────────────────────────

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

export async function computeAspectBarsAsync(
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
  fromSample: number;
  toSample: number;
  peakSample: number;
  peakValue: number;
}

function computeRange(bar: AspectBar): BarRange | null {
  let fromSample = -1;
  let toSample = -1;
  let peakSample = 0;
  let peakValue = -1;
  for (let i = 0; i < bar.samples.length; i++) {
    const v = bar.samples[i]!;
    if (v > ACTIVE_THRESHOLD) {
      if (fromSample === -1) fromSample = i;
      toSample = i;
    }
    if (v > peakValue) {
      peakValue = v;
      peakSample = i;
    }
  }
  if (fromSample === -1 || toSample === -1) return null;

  // Fast-body aspects often peak between 6h samples, so the raw sample-max
  // understates them (Moon-Sun can read 0.91 when the true conjunction is
  // ~1.0). `interpolatePeaks` fits a V-shape through each local maximum and
  // returns the analytically-derived apex. Use it for the peak time + value.
  const interp = interpolatePeaks(bar.samples);
  let bestX = peakSample;
  let bestVal = peakValue;
  for (const p of interp) {
    if (p.value > bestVal) {
      bestVal = p.value;
      bestX = p.x;
    }
  }

  return {
    bar,
    fromSample,
    toSample,
    peakSample: bestX,
    peakValue: Math.min(1, bestVal),
  };
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

  const ranges = useMemo(() => {
    const filter = isMinor ? MINOR_ASPECTS : MAJOR_ASPECTS;
    const list: BarRange[] = [];
    for (const bar of bars) {
      if (!filter.has(bar.aspectType)) continue;
      const r = computeRange(bar);
      if (r) list.push(r);
    }
    // Rank by peak intensity, breaking ties in favour of aspects whose peak
    // lands closest to today. Without the tiebreaker, fast-body aspects
    // (Moon transits, Sun aspects) all interpolate to peak=1.0 and the 8
    // slots go to whichever the sort happens to hit first — which can push
    // out the "topical" event (e.g. today's Moon-Sun conjunction) in favour
    // of, say, a Moon-Neptune conjunction peaking 4 days from now.
    const todayCenterSample = -DAY_OFFSET * SAMPLES_PER_DAY + SAMPLES_PER_DAY / 2;
    const distanceFromToday = (r: BarRange) =>
      Math.abs(r.peakSample - todayCenterSample);
    const top = list
      .sort((a, b) => {
        // Round peaks to 2 decimals so near-ties (0.997 vs 1.000) treat
        // today-proximity as the real discriminator.
        const ap = Math.round(a.peakValue * 100);
        const bp = Math.round(b.peakValue * 100);
        if (ap !== bp) return bp - ap;
        return distanceFromToday(a) - distanceFromToday(b);
      })
      .slice(0, MAX_BARS);
    top.sort((a, b) => {
      if (a.peakSample !== b.peakSample) return a.peakSample - b.peakSample;
      return b.peakValue - a.peakValue;
    });
    return top;
  }, [bars, isMinor]);

  const todayIdx = -DAY_OFFSET;
  const dayW = VIEWBOX_W / DAY_COUNT;
  const todayX = todayIdx * dayW;           // left boundary of today's slot
  const todayCenterX = todayX + dayW / 2;
  const height = TOP_PAD + Math.max(ranges.length, 6) * ROW_HEIGHT + BOTTOM_PAD;

  const sampleToX = (sampleIdx: number) =>
    ((sampleIdx + 0.5) / TOTAL_SAMPLES) * VIEWBOX_W;

  // Current moment within the 10-day window, expressed in viewBox x.
  // Used to draw a thin accent line at "now" so the user can distinguish
  // "happened earlier today" (peak left of NOW) from "coming up" (peak right).
  const windowStartMs = today.getTime() + DAY_OFFSET * 24 * 3600 * 1000;
  const windowDurationMs = DAY_COUNT * 24 * 3600 * 1000;
  const nowProgress = (Date.now() - windowStartMs) / windowDurationMs;
  const nowX =
    nowProgress >= 0 && nowProgress <= 1
      ? nowProgress * VIEWBOX_W
      : null;

  const isLoading = bars.length === 0;

  return (
    <div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
      <div className="flex items-baseline justify-between mb-phi-3">
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

          {/* TODAY eyebrow — centered inside today's slot */}
          <text
            x={todayCenterX}
            y={16}
            fontSize="10"
            fill="var(--muted-foreground)"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.15em"
            fontWeight="500"
            textAnchor="middle"
          >
            TODAY
          </text>

          {/* NOW marker — thin dotted accent line at the current moment */}
          {nowX !== null && (
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
          )}

          {/* Aspect bars */}
          {ranges.map((r, idx) => {
            const y = TOP_PAD + idx * ROW_HEIGHT;
            const x1 = sampleToX(r.fromSample);
            const x2 = sampleToX(r.toSample);
            const peakX = sampleToX(r.peakSample);
            const color =
              ASPECT_COLORS[r.bar.aspectType] ?? "var(--muted-foreground)";
            const pG = PLANET_GLYPHS[r.bar.groupPlanet] ?? "·";
            const aG = ASPECT_GLYPHS[r.bar.aspectType] ?? "·";
            const oG = PLANET_GLYPHS[r.bar.otherPlanet] ?? "·";
            return (
              <g key={`bar-${idx}`}>
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
                <circle cx={peakX} cy={y} r={3} fill={color} />
                <text
                  x={x1 - 6}
                  y={y + 3}
                  fontSize={10}
                  textAnchor="end"
                  fill="var(--muted-foreground)"
                >
                  <tspan>{pG}</tspan>
                  <tspan style={{ fill: color }}>{aG}</tspan>
                  <tspan>{oG}</tspan>
                </text>
              </g>
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
                fontSize={10}
                textAnchor="middle"
                fill={isToday ? "var(--primary)" : "var(--dim-foreground)"}
                fontFamily="ui-monospace, monospace"
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
