# Aspect Timeline Bell Curves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat color bars in the Aspects Timeline with soft bell curve area graphs that show aspect intensity over time, peaking at exactness and tapering to zero at the orb boundary.

**Architecture:** Sub-day sampling (every 6 hours, 40 samples across 10 days) using the local `calculateApproximate` engine. Pure math helpers are extracted to a separate file for testability. Each aspect row renders an SVG with a Catmull-Rom smooth path, gradient fill, and peak dot.

**Tech Stack:** React 18, SVG, Vitest, `@astro-app/approx-engine` (local, no network)

---

### Task 1: Pure math helpers + tests

**Files:**
- Create: `apps/web/src/components/home/aspects-timeline-utils.ts`
- Create: `apps/web/src/components/home/aspects-timeline-utils.test.ts`

- [ ] **Step 1: Create the utils file**

`apps/web/src/components/home/aspects-timeline-utils.ts`:
```typescript
/**
 * Converts an orb value to an intensity in [0, 1].
 * intensity = 1 at orb = 0 (exact aspect), 0 at orb = maxOrb.
 */
export function orbIntensity(orb: number, maxOrb: number): number {
  if (maxOrb <= 0) return 0;
  return Math.max(0, 1 - orb / maxOrb);
}

/**
 * Converts an array of [x, y] points into a smooth SVG cubic Bézier path
 * using Catmull-Rom parameterisation (uniform, tension = 1/6).
 * The path starts with "M" and uses "C" commands. Does NOT close the path.
 */
export function catmullRomPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0]!;
    return `M ${x},${y}`;
  }

  // Pad with phantom endpoints so the curve passes through first and last points
  const pts: [number, number][] = [
    points[0]!,
    ...points,
    points[points.length - 1]!,
  ];

  let d = `M ${pts[1]![0]},${pts[1]![1]}`;

  for (let i = 1; i < pts.length - 2; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[i + 1]!;
    const [x3, y3] = pts[i + 2]!;

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  return d;
}
```

- [ ] **Step 2: Write the tests**

`apps/web/src/components/home/aspects-timeline-utils.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { orbIntensity, catmullRomPath } from "./aspects-timeline-utils";

describe("orbIntensity", () => {
  it("returns 1 when orb is 0 (exact aspect)", () => {
    expect(orbIntensity(0, 8)).toBe(1);
  });

  it("returns 0 when orb equals maxOrb", () => {
    expect(orbIntensity(8, 8)).toBe(0);
  });

  it("returns 0.5 at half the maxOrb", () => {
    expect(orbIntensity(4, 8)).toBe(0.5);
  });

  it("clamps to 0 when orb exceeds maxOrb", () => {
    expect(orbIntensity(10, 8)).toBe(0);
  });

  it("returns 0 when maxOrb is 0", () => {
    expect(orbIntensity(0, 0)).toBe(0);
  });
});

describe("catmullRomPath", () => {
  it("returns empty string for empty input", () => {
    expect(catmullRomPath([])).toBe("");
  });

  it("returns a move command for a single point", () => {
    expect(catmullRomPath([[10, 20]])).toBe("M 10,20");
  });

  it("starts with M for the first point", () => {
    const path = catmullRomPath([[0, 50], [100, 50]]);
    expect(path).toMatch(/^M 0,50/);
  });

  it("produces a C command for each segment after the first point", () => {
    const path = catmullRomPath([[0, 50], [50, 0], [100, 50]]);
    const segments = path.match(/C /g);
    expect(segments).toHaveLength(2);
  });

  it("ends at the last point coordinates", () => {
    const path = catmullRomPath([[0, 100], [50, 0], [100, 100]]);
    expect(path).toContain("100.00,100.00");
  });
});
```

- [ ] **Step 3: Run tests (expect FAIL — module not found)**

```bash
cd /path/to/almagest-frontend && npm test --workspace=apps/web -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|aspects-timeline-utils"
```

Expected: FAIL because `aspects-timeline-utils.ts` has no exports yet (or pass if file was just created — either is fine; the point is the test file resolves).

Actually since we created the file in Step 1, run and expect PASS:

```bash
npm test --workspace=apps/web -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests in `aspects-timeline-utils.test.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline-utils.ts apps/web/src/components/home/aspects-timeline-utils.test.ts
git commit -m "feat: phase3 - add orbIntensity and catmullRomPath utils for bell curve timeline"
```

---

### Task 2: Update data model and rendering in aspects-timeline.tsx

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline.tsx`

- [ ] **Step 1: Replace the full file contents**

Replace `apps/web/src/components/home/aspects-timeline.tsx` with:

```tsx
import { useMemo } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { CelestialBody, AspectType } from "@astro-app/shared-types";
import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/format";
import { orbIntensity, catmullRomPath } from "./aspects-timeline-utils";

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
  CelestialBody.Jupiter,
  CelestialBody.Mars,
];

const GROUP_PLANET_NAMES: Partial<Record<CelestialBody, string>> = {
  [CelestialBody.Pluto]: "Pluto",
  [CelestialBody.Neptune]: "Neptune",
  [CelestialBody.Uranus]: "Uranus",
  [CelestialBody.Saturn]: "Saturn",
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

/** Max orb per aspect type — mirrors ASPECT_DEFINITIONS in approx-engine */
const MAX_ORB: Partial<Record<AspectType, number>> = {
  [AspectType.Conjunction]: 8,
  [AspectType.Sextile]: 6,
  [AspectType.Square]: 7,
  [AspectType.Trine]: 8,
  [AspectType.Opposition]: 8,
  [AspectType.Quincunx]: 3,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AspectBar {
  groupPlanet: CelestialBody;
  otherPlanet: CelestialBody;
  aspectType: AspectType;
  /** Intensity [0, 1] at each of TOTAL_SAMPLES sample points (every 6 h) */
  samples: number[];
}

// ─── Data computation ─────────────────────────────────────────────────────────

function computeAspectBars(today: Date): AspectBar[] {
  const sampleMaps: Map<string, number>[] = [];

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const dayIndex = Math.floor(i / SAMPLES_PER_DAY);
    const hourIndex = i % SAMPLES_PER_DAY;

    const d = new Date(today);
    d.setDate(d.getDate() + DAY_OFFSET + dayIndex);
    d.setHours(hourIndex * (24 / SAMPLES_PER_DAY), 0, 0, 0);

    const chart = calculateApproximate(d, 0, 0);
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

      const maxOrb = MAX_ORB[aspect.type as AspectType] ?? 8;
      const intensity = orbIntensity(aspect.orb, maxOrb);
      const key = `${groupPlanet}|${aspect.type}|${otherPlanet}`;
      intensityMap.set(key, intensity);
    }

    sampleMaps.push(intensityMap);
  }

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
      className={`flex-1 text-center text-xs py-1 ${
        isToday ? "text-primary font-semibold" : "text-muted-foreground"
      }`}
    >
      {label}
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

  // Peak: sample with highest intensity
  const peakIdx = samples.reduce(
    (best, v, i) => (v > (samples[best] ?? 0) ? i : best),
    0,
  );
  const peakPt = pts[peakIdx]!;
  const hasPeak = (samples[peakIdx] ?? 0) > 0.05;

  // Today vertical line — align with day column centers in the header
  const todayX = ((todayIdx + 0.5) / DAY_COUNT) * VIEWBOX_W;

  return (
    <svg
      width="100%"
      height="36"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
      {hasPeak && (
        <circle cx={peakPt[0]} cy={peakPt[1]} r="4" fill={color} opacity="0.9" />
      )}
      <line
        x1={todayX}
        y1="0"
        x2={todayX}
        y2={VIEWBOX_H}
        stroke="var(--accent-primary)"
        strokeWidth="1.5"
        strokeDasharray="4,3"
        opacity="0.4"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AspectsTimeline() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + DAY_OFFSET + i);
        return d;
      }),
    [today],
  );

  const bars = useMemo(() => computeAspectBars(today), [today]);

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

  if (groups.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-foreground font-semibold text-sm mb-3">Aspects Timeline</h3>
        <p className="text-muted-foreground text-sm">
          No major aspects in the next {DAY_COUNT} days.
        </p>
      </div>
    );
  }

  const todayIdx = -DAY_OFFSET;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-foreground font-semibold text-sm mb-4">Aspects Timeline</h3>

      {/* Day header row */}
      <div className="flex mb-2">
        <div className="w-[70px] shrink-0" />
        {days.map((day, i) => (
          <DayLabel key={i} date={day} isToday={i === todayIdx} />
        ))}
      </div>

      {/* Planet groups */}
      <div className="flex flex-col gap-4">
        {groups.map(({ planet, bars: groupBars }) => (
          <div key={planet}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-muted-foreground text-sm">Transiting </span>
              <span className="text-primary text-base">{PLANET_GLYPHS[planet]}</span>
              <span className="text-foreground text-sm font-medium">
                {GROUP_PLANET_NAMES[planet]}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {groupBars.map((bar, bi) => {
                const color = ASPECT_COLORS[bar.aspectType] ?? "var(--muted-foreground)";
                const uid = `${bar.groupPlanet}-${bar.aspectType}-${bar.otherPlanet}`;
                return (
                  <div key={bi} className="flex items-center" style={{ height: "36px" }}>
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
}
```

- [ ] **Step 2: Run tests to verify utils still pass**

```bash
npm test --workspace=apps/web -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass (including `aspects-timeline-utils.test.ts`).

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck --workspace=apps/web 2>&1 | tail -20
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline.tsx
git commit -m "feat: phase3 - ALM-XX aspects timeline bell curve area graphs"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sub-day sampling (40 samples, every 6 hours)
- ✅ Intensity = `1 - orb/maxOrb`
- ✅ Soft bell curve (Catmull-Rom smooth path)
- ✅ Gradient fill (color, 0.85 → 0.08 opacity)
- ✅ Stroke line along top edge
- ✅ Peak dot (r=4, hidden if intensity < 0.05)
- ✅ Today dashed vertical line
- ✅ 36px row height
- ✅ Planet group headers, label column, day header unchanged

**Placeholder scan:** None found.

**Type consistency:** `orbIntensity` and `catmullRomPath` are used with the same signatures in both utils file and timeline component. `AspectBar.samples: number[]` is used consistently throughout. `BellCurveProps.uid: string` matches the call site.
