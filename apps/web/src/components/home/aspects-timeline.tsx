import { useMemo, useState, useEffect, useRef, memo } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { CelestialBody, AspectType } from "@astro-app/shared-types";
import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/format";
import { orbIntensity, catmullRomPath } from "./aspects-timeline-utils";
import { useSettings } from "@/hooks/use-settings";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_COUNT = 10;
const DAY_OFFSET = -2;
const SAMPLES_PER_DAY = 4; // every 6 hours
const TOTAL_SAMPLES = DAY_COUNT * SAMPLES_PER_DAY;

const VIEWBOX_W = 1000;
const VIEWBOX_H = 100;

const GROUP_PLANETS: CelestialBody[] = [
  CelestialBody.Pluto,
  CelestialBody.Neptune,
  CelestialBody.Uranus,
  CelestialBody.Saturn,
  CelestialBody.Chiron,
  CelestialBody.Jupiter,
  CelestialBody.Mars,
];

const GROUP_PLANET_NAMES: Partial<Record<CelestialBody, string>> = {
  [CelestialBody.Pluto]: "Pluto",
  [CelestialBody.Neptune]: "Neptune",
  [CelestialBody.Uranus]: "Uranus",
  [CelestialBody.Saturn]: "Saturn",
  [CelestialBody.Chiron]: "Chiron",
  [CelestialBody.Jupiter]: "Jupiter",
  [CelestialBody.Mars]: "Mars",
};

const ASPECT_COLORS: Partial<Record<AspectType, string>> = {
  [AspectType.Conjunction]: "var(--aspect-conjunction)",
  [AspectType.Sextile]: "var(--aspect-sextile)",
  [AspectType.Square]: "var(--aspect-square)",
  [AspectType.Trine]: "var(--aspect-trine)",
  [AspectType.Opposition]: "var(--aspect-opposition)",
  [AspectType.Quincunx]: "var(--aspect-quincunx)",
};

/** Default max orb per aspect type — overridden by settings */
const DEFAULT_MAX_ORB: Partial<Record<AspectType, number>> = {
  [AspectType.Conjunction]: 8,
  [AspectType.Opposition]: 8,
  [AspectType.Trine]: 8,
  [AspectType.Square]: 8,
  [AspectType.Sextile]: 4,
  [AspectType.Quincunx]: 2,
};

/** Map settings keys to AspectType */
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

function buildMaxOrbMap(settingsOrbs: Record<string, number>): Partial<Record<AspectType, number>> {
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

/** Yield to the main thread so clicks / paints are not blocked. */
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

    // Yield after every sample to keep UI responsive
    await yieldToMain();
  }

  if (signal.aborted) return [];

  // Collect all aspect keys seen across any sample
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

  const groupOrder = (p: CelestialBody) => GROUP_PLANETS.indexOf(p);
  bars.sort((a, b) => {
    const gDiff = groupOrder(a.groupPlanet) - groupOrder(b.groupPlanet);
    if (gDiff !== 0) return gDiff;
    return a.otherPlanet.localeCompare(b.otherPlanet);
  });

  return bars;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayLabel({ date, isToday }: { date: Date; isToday: boolean }) {
  const label = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  return (
    <div
      className={`flex-1 text-center text-xs tabular-nums py-1 rounded-sm ${isToday
        ? "text-primary font-semibold bg-primary/[0.06]"
        : "text-muted-foreground"
        }`}
    >
      {label}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center" style={{ height: "34px" }}>
      <div className="w-[70px] shrink-0 flex items-center gap-0.5">
        <div className="w-5 h-3 rounded bg-muted animate-pulse" />
        <div className="w-5 h-3 rounded bg-muted animate-pulse" />
        <div className="w-5 h-3 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex-1 min-w-0 h-[34px] rounded bg-muted/50 animate-pulse" />
    </div>
  );
}

interface BellCurveProps {
  samples: number[];
  color: string;
  todayIdx: number;
  uid: string;
}

function BellCurve({ samples, color, todayIdx, uid }: BellCurveProps) {
  const n = samples.length;
  const gradId = `bell-grad-${uid}`;
  const ACTIVE_THRESHOLD = 0.02;

  // Map sample intensities to SVG coordinates
  // y is inverted: intensity 1 (peak) → y near 0 (top), intensity 0 → y = VIEWBOX_H (bottom)
  const pts: [number, number][] = samples.map((v, i) => [
    ((i + 0.5) / n) * VIEWBOX_W,
    (1 - v) * VIEWBOX_H,
  ]);

  const linePath = catmullRomPath(pts);
  const first = pts[0]!;
  const last = pts[n - 1]!;
  const areaPath = `${linePath} L ${last[0]},${VIEWBOX_H} L ${first[0]},${VIEWBOX_H} Z`;

  // Build smooth paths only over active (non-zero) runs, expanded by 1 pt each side
  // so the bright stroke fades naturally into the dim baseline.
  const activeSegPaths: string[] = [];
  let segStart = -1;
  for (let i = 0; i <= n; i++) {
    const active = i < n && (samples[i] ?? 0) > ACTIVE_THRESHOLD;
    if (active && segStart === -1) {
      segStart = Math.max(0, i - 1);
    } else if (!active && segStart !== -1) {
      const segPts = pts.slice(segStart, Math.min(n - 1, i) + 1);
      if (segPts.length >= 2) activeSegPaths.push(catmullRomPath(segPts));
      segStart = -1;
    }
  }

  // Peak: sample with highest intensity
  const peakIdx = samples.reduce(
    (best, v, i) => (v > (samples[best] ?? 0) ? i : best),
    0,
  );
  const peakPt = pts[peakIdx]!;
  const hasPeak = (samples[peakIdx] ?? 0) > 0.05;

  // Grid: one column per day, dividers at boundaries, highlight on today
  const dayWidth = VIEWBOX_W / DAY_COUNT;
  const todayX = todayIdx * dayWidth;

  return (
    <svg
      width="100%"
      height="34"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="cursor-crosshair"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Today column highlight */}
      <rect x={todayX} y="0" width={dayWidth} height={VIEWBOX_H} fill="var(--primary)" opacity="0.07" />

      {/* Day divider lines (skip the first — left edge of container serves as boundary) */}
      {Array.from({ length: DAY_COUNT - 1 }, (_, i) => (
        <line
          key={i}
          x1={(i + 1) * dayWidth}
          y1="0"
          x2={(i + 1) * dayWidth}
          y2={VIEWBOX_H}
          stroke="var(--border)"
          strokeWidth="1"
          opacity="0.25"
        />
      ))}

      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Dim hairline across the full path — almost invisible baseline */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="5" opacity="0.15" />
      {/* Bright stroke only on active (non-zero intensity) portions */}
      {activeSegPaths.map((p, i) => (
        <path key={i} d={p} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
      ))}
      {hasPeak && (
        <>
          <circle cx={peakPt[0]} cy={peakPt[1]} r="4" fill={color} opacity="0.9" />
          <circle cx={peakPt[0]} cy={peakPt[1]} r="1.5" fill="white" opacity="0.9" />
        </>
      )}

      {/* Today center marker — subtle dashed line at column center */}
      <line
        x1={todayX + dayWidth / 2}
        y1="0"
        x2={todayX + dayWidth / 2}
        y2={VIEWBOX_H}
        stroke="var(--primary)"
        strokeWidth="1"
        strokeDasharray="3,4"
        opacity="0.35"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AspectsTimeline = memo(function AspectsTimeline() {
  const aspectSettings = useSettings((s) => s.aspects);

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

    // Defer heavy computation so above-the-fold widgets paint first
    const id = requestAnimationFrame(() => {
      void computeAspectBarsAsync(today, aspectSettings.orbs, aspectSettings.showMinor, maxOrbMap, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setBars(result);
        });
    });
    return () => { cancelAnimationFrame(id); controller.abort(); };
  }, [today, aspectSettings, maxOrbMap]);

  const groups = useMemo(() => {
    const map = new Map<CelestialBody, AspectBar[]>();
    for (const bar of bars) {
      const existing = map.get(bar.groupPlanet) ?? [];
      existing.push(bar);
      map.set(bar.groupPlanet, existing);
    }
    return GROUP_PLANETS.filter((p) => map.has(p)).map((p) => ({
      planet: p,
      bars: map.get(p)!,
    }));
  }, [bars]);

  const todayIdx = -DAY_OFFSET;

  if (bars.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
        <h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">Aspects Timeline</h3>

        {/* Day header row */}
        <div className="flex mb-2">
          <div className="w-[70px] shrink-0" />
          {days.map((day, i) => (
            <DayLabel key={i} date={day} isToday={i === todayIdx} />
          ))}
        </div>

        {/* Skeleton rows */}
        <div className="flex flex-col gap-phi-4">
          {[0, 1, 2].map((g) => (
            <div key={g}>
              <div className="w-16 h-4 rounded bg-muted animate-pulse mb-1.5" />
              <div className="flex flex-col gap-1">
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
      <h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">Aspects Timeline</h3>

      {/* Day header row */}
      <div className="flex mb-2">
        <div className="w-[70px] shrink-0" />
        {days.map((day, i) => (
          <DayLabel key={i} date={day} isToday={i === todayIdx} />
        ))}
      </div>

      {/* Planet groups — staggered entry */}
      <div className="flex flex-col gap-phi-4">
        {groups.map(({ planet, bars: groupBars }, groupIdx) => (
          <div
            key={planet}
            className="animate-fade-in"
            style={{ animationDelay: `${groupIdx * 40}ms` }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-primary text-sm">{PLANET_GLYPHS[planet]}</span>
              <span className="text-foreground text-sm font-medium">
                {GROUP_PLANET_NAMES[planet]}
              </span>
            </div>

            <div className="flex flex-col gap-phi-1">
              {groupBars.map((bar) => {
                const color = ASPECT_COLORS[bar.aspectType] ?? "var(--muted-foreground)";
                const uid = `${bar.groupPlanet}-${bar.aspectType}-${bar.otherPlanet}`;
                const groupName = GROUP_PLANET_NAMES[bar.groupPlanet] ?? bar.groupPlanet;
                const otherGlyph = PLANET_GLYPHS[bar.otherPlanet] ?? bar.otherPlanet;
                const aspectGlyph = ASPECT_GLYPHS[bar.aspectType] ?? bar.aspectType;
                return (
                  <div
                    key={uid}
                    className="flex items-center"
                    style={{ height: "34px" }}
                    title={`${groupName} ${aspectGlyph} ${otherGlyph}`}
                  >
                    {/* Label: group glyph + aspect glyph + other glyph */}
                    <div className="w-[70px] shrink-0 flex items-center gap-0.5">
                      <span className="text-primary text-sm w-5 text-center">
                        {PLANET_GLYPHS[bar.groupPlanet]}
                      </span>
                      <span className="text-sm w-5 text-center" style={{ color }}>
                        {ASPECT_GLYPHS[bar.aspectType] ?? bar.aspectType}
                      </span>
                      <span className="text-muted-foreground text-sm w-5 text-center">
                        {PLANET_GLYPHS[bar.otherPlanet] ?? bar.otherPlanet}
                      </span>
                    </div>

                    {/* Bell curve SVG */}
                    <div className="flex-1 min-w-0">
                      <BellCurve
                        samples={bar.samples}
                        color={color}
                        todayIdx={todayIdx}
                        uid={uid}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
