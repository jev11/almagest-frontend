# Planetary Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Planetary Hours card to the home screen that shows the current planetary hour, day ruler, progress bar, and expands to show all 24 hours.

**Architecture:** Pure client-side calculation using `suncalc` for sunrise/sunset. Calculation logic lives in `src/lib/planetary-hours.ts` (pure functions, no React). React component in `src/components/home/planetary-hours.tsx` consumes the calculation and renders compact/expanded views. Integrated into `routes/home.tsx` below MoonCard.

**Tech Stack:** suncalc (sunrise/sunset), React, Tailwind CSS, Vitest

---

### Task 1: Install suncalc

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install suncalc and its types**

```bash
cd apps/web && npm install suncalc && npm install -D @types/suncalc
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/web && node -e "const sc = require('suncalc'); const t = sc.getTimes(new Date(), 55.75, 37.61); console.log('sunrise:', t.sunrise, 'sunset:', t.sunset)"
```

Expected: prints sunrise and sunset Date objects for Moscow coordinates.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add suncalc dependency for planetary hours"
```

---

### Task 2: Planetary hours calculation logic — tests

**Files:**
- Create: `apps/web/src/lib/planetary-hours.test.ts`

These tests define the expected behavior before writing the implementation. Use a fixed date/location so results are deterministic.

- [ ] **Step 1: Write tests for core calculation**

```typescript
// apps/web/src/lib/planetary-hours.test.ts
import { describe, it, expect } from "vitest";
import { calculatePlanetaryHours, CHALDEAN_ORDER, DAY_RULERS } from "./planetary-hours";

// Sunday April 6, 2026, 14:00 UTC — Moscow (55.75°N, 37.61°E)
// suncalc gives sunrise ~03:25 UTC, sunset ~16:42 UTC for this date/location
const MOSCOW_LAT = 55.75;
const MOSCOW_LON = 37.61;
const SUNDAY_AFTERNOON = new Date("2026-04-06T14:00:00Z");

describe("calculatePlanetaryHours", () => {
  it("returns 24 hours (12 day + 12 night)", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    expect(result.allHours).toHaveLength(24);
    expect(result.allHours.filter((h) => h.isDay)).toHaveLength(12);
    expect(result.allHours.filter((h) => !h.isDay)).toHaveLength(12);
  });

  it("first day hour starts at sunrise and is ruled by the day ruler", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    // Sunday day ruler is Sun
    expect(result.dayRuler).toBe("sun");
    expect(result.allHours[0]!.planet).toBe("sun");
    // First hour starts at sunrise
    expect(result.allHours[0]!.start.getTime()).toBe(result.sunrise.getTime());
  });

  it("hours follow Chaldean order from the day ruler", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    // Sunday: Sun is index 3 in CHALDEAN_ORDER
    const startIdx = CHALDEAN_ORDER.indexOf("sun");
    for (let i = 0; i < 24; i++) {
      const expectedPlanet = CHALDEAN_ORDER[(startIdx + i) % 7]!;
      expect(result.allHours[i]!.planet).toBe(expectedPlanet);
    }
  });

  it("day hours evenly divide sunrise-to-sunset", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    const dayDuration = result.sunset.getTime() - result.sunrise.getTime();
    const expectedHourMs = dayDuration / 12;
    for (let i = 0; i < 12; i++) {
      const hour = result.allHours[i]!;
      const duration = hour.end.getTime() - hour.start.getTime();
      expect(Math.abs(duration - expectedHourMs)).toBeLessThan(10); // < 10ms rounding
    }
  });

  it("night hours evenly divide sunset-to-next-sunrise", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    const nightDuration = result.nextSunrise.getTime() - result.sunset.getTime();
    const expectedHourMs = nightDuration / 12;
    for (let i = 12; i < 24; i++) {
      const hour = result.allHours[i]!;
      const duration = hour.end.getTime() - hour.start.getTime();
      expect(Math.abs(duration - expectedHourMs)).toBeLessThan(10);
    }
  });

  it("hours are contiguous (each end === next start)", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    for (let i = 0; i < 23; i++) {
      expect(result.allHours[i]!.end.getTime()).toBe(result.allHours[i + 1]!.start.getTime());
    }
  });

  it("identifies the current hour correctly", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    expect(result.currentHour.start.getTime()).toBeLessThanOrEqual(SUNDAY_AFTERNOON.getTime());
    expect(result.currentHour.end.getTime()).toBeGreaterThan(SUNDAY_AFTERNOON.getTime());
  });

  it("nextHour is the hour immediately after currentHour", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON);
    expect(result.nextHour.start.getTime()).toBe(result.currentHour.end.getTime());
  });

  it("returns null result for polar regions where sunrise/sunset is NaN", () => {
    // Svalbard in summer — no sunset
    const midsummer = new Date("2026-06-21T12:00:00Z");
    const result = calculatePlanetaryHours(midsummer, 78.0, 16.0);
    expect(result).toBeNull();
  });

  it("handles time before sunrise (previous day's night hours)", () => {
    const beforeSunrise = new Date("2026-04-06T02:00:00Z"); // ~1.5h before Moscow sunrise
    const result = calculatePlanetaryHours(beforeSunrise, MOSCOW_LAT, MOSCOW_LON);
    expect(result).not.toBeNull();
    expect(result!.currentHour.isDay).toBe(false);
  });
});

describe("DAY_RULERS", () => {
  it("maps all 7 weekdays", () => {
    expect(Object.keys(DAY_RULERS)).toHaveLength(7);
    expect(DAY_RULERS[0]).toBe("sun");     // Sunday
    expect(DAY_RULERS[1]).toBe("moon");    // Monday
    expect(DAY_RULERS[6]).toBe("saturn");  // Saturday
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test --workspace=apps/web -- --run src/lib/planetary-hours.test.ts
```

Expected: FAIL — `planetary-hours` module not found.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/planetary-hours.test.ts
git commit -m "test: add planetary hours calculation tests (red)"
```

---

### Task 3: Planetary hours calculation logic — implementation

**Files:**
- Create: `apps/web/src/lib/planetary-hours.ts`

- [ ] **Step 1: Implement the calculation module**

```typescript
// apps/web/src/lib/planetary-hours.ts
import SunCalc from "suncalc";

export const CHALDEAN_ORDER = [
  "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon",
] as const;

export const DAY_RULERS: Record<number, string> = {
  0: "sun",       // Sunday
  1: "moon",      // Monday
  2: "mars",      // Tuesday
  3: "mercury",   // Wednesday
  4: "jupiter",   // Thursday
  5: "venus",     // Friday
  6: "saturn",    // Saturday
};

export interface PlanetaryHour {
  planet: string;
  start: Date;
  end: Date;
  isDay: boolean;
  hourNumber: number; // 1–12
}

export interface PlanetaryHoursResult {
  dayRuler: string;
  currentHour: PlanetaryHour;
  nextHour: PlanetaryHour;
  allHours: PlanetaryHour[];   // 24 entries (12 day + 12 night)
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
}

/**
 * Calculate planetary hours for the given moment and location.
 * Returns null if sunrise/sunset cannot be determined (polar regions).
 *
 * If `now` is before today's sunrise, we calculate based on yesterday's
 * sunset → today's sunrise for the night hours.
 */
export function calculatePlanetaryHours(
  now: Date,
  lat: number,
  lon: number,
): PlanetaryHoursResult | null {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0); // noon for stable suncalc results

  const todayTimes = SunCalc.getTimes(today, lat, lon);
  const sunrise = todayTimes.sunrise;
  const sunset = todayTimes.sunset;

  // Check for polar regions (NaN)
  if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
    return null;
  }

  // If now is before today's sunrise, use yesterday's day + tonight's hours
  if (now.getTime() < sunrise.getTime()) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const yesterdayTimes = SunCalc.getTimes(yesterday, lat, lon);
    if (isNaN(yesterdayTimes.sunrise.getTime()) || isNaN(yesterdayTimes.sunset.getTime())) {
      return null;
    }
    return buildResult(
      yesterdayTimes.sunrise,
      yesterdayTimes.sunset,
      sunrise, // next sunrise = today's sunrise
      yesterday,
      now,
    );
  }

  // Normal case: now is between sunrise and next sunrise
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lon);
  const nextSunrise = tomorrowTimes.sunrise;

  if (isNaN(nextSunrise.getTime())) {
    return null;
  }

  return buildResult(sunrise, sunset, nextSunrise, today, now);
}

function buildResult(
  sunrise: Date,
  sunset: Date,
  nextSunrise: Date,
  dayDate: Date,
  now: Date,
): PlanetaryHoursResult {
  const weekday = dayDate.getDay();
  const dayRuler = DAY_RULERS[weekday]!;

  const dayDuration = sunset.getTime() - sunrise.getTime();
  const nightDuration = nextSunrise.getTime() - sunset.getTime();
  const dayHourMs = dayDuration / 12;
  const nightHourMs = nightDuration / 12;

  const startIdx = CHALDEAN_ORDER.indexOf(dayRuler as typeof CHALDEAN_ORDER[number]);

  const allHours: PlanetaryHour[] = [];

  // 12 day hours
  for (let i = 0; i < 12; i++) {
    allHours.push({
      planet: CHALDEAN_ORDER[(startIdx + i) % 7]!,
      start: new Date(sunrise.getTime() + i * dayHourMs),
      end: new Date(sunrise.getTime() + (i + 1) * dayHourMs),
      isDay: true,
      hourNumber: i + 1,
    });
  }

  // 12 night hours
  for (let i = 0; i < 12; i++) {
    allHours.push({
      planet: CHALDEAN_ORDER[(startIdx + 12 + i) % 7]!,
      start: new Date(sunset.getTime() + i * nightHourMs),
      end: new Date(sunset.getTime() + (i + 1) * nightHourMs),
      isDay: false,
      hourNumber: i + 1,
    });
  }

  // Find current hour
  const nowMs = now.getTime();
  let currentIdx = allHours.findIndex(
    (h) => nowMs >= h.start.getTime() && nowMs < h.end.getTime(),
  );
  if (currentIdx === -1) currentIdx = 0; // fallback

  const currentHour = allHours[currentIdx]!;
  const nextHour = allHours[currentIdx + 1] ?? allHours[0]!;

  return {
    dayRuler,
    currentHour,
    nextHour,
    allHours,
    sunrise,
    sunset,
    nextSunrise,
  };
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test --workspace=apps/web -- --run src/lib/planetary-hours.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/planetary-hours.ts
git commit -m "feat: implement planetary hours calculation"
```

---

### Task 4: Planetary Hours React component

**Files:**
- Create: `apps/web/src/components/home/planetary-hours.tsx`

The component has two modes: compact (default) and expanded (click to toggle). It follows the same card patterns as RetrogradeTracker and MoonCard.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/home/planetary-hours.tsx
import { useState, useMemo } from "react";
import { calculatePlanetaryHours } from "@/lib/planetary-hours";
import type { PlanetaryHoursResult } from "@/lib/planetary-hours";
import { PLANET_GLYPHS, formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";

const PLANET_NAMES: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
};

const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface PlanetaryHoursProps {
  lat: number;
  lon: number;
}

export function PlanetaryHours({ lat, lon }: PlanetaryHoursProps) {
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(
    () => calculatePlanetaryHours(new Date(), lat, lon),
    [lat, lon],
  );

  if (!result) {
    return (
      <div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
        <p className="text-muted-foreground text-sm">
          Planetary hours unavailable at this latitude
        </p>
      </div>
    );
  }

  const { dayRuler, currentHour, nextHour, sunrise, sunset, nextSunrise, allHours } = result;
  const progress = (Date.now() - currentHour.start.getTime()) /
    (currentHour.end.getTime() - currentHour.start.getTime());

  return (
    <div
      className="bg-card border border-border rounded-lg p-phi-4 card-hover cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Compact view — always visible */}
      <CompactView
        dayRuler={dayRuler}
        currentHour={currentHour}
        nextHour={nextHour}
        progress={progress}
        timeFormat={timeFormat}
      />

      {/* Expanded view — full 24-hour table */}
      {expanded && (
        <ExpandedView
          result={result}
          timeFormat={timeFormat}
        />
      )}
    </div>
  );
}

function CompactView({
  dayRuler,
  currentHour,
  nextHour,
  progress,
  timeFormat,
}: {
  dayRuler: string;
  currentHour: PlanetaryHoursResult["currentHour"];
  nextHour: PlanetaryHoursResult["nextHour"];
  progress: number;
  timeFormat: "12h" | "24h";
}) {
  return (
    <div className="flex flex-col gap-phi-2">
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <span className="text-primary">{PLANET_GLYPHS[dayRuler]}</span>
        <span className="text-foreground">Day of {PLANET_NAMES[dayRuler]}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-primary">{PLANET_GLYPHS[currentHour.planet]}</span>
        <span className="text-foreground">Hour of {PLANET_NAMES[currentHour.planet]}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">until {formatTime(currentHour.end, timeFormat)}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        next hour: {PLANET_GLYPHS[nextHour.planet]} {PLANET_NAMES[nextHour.planet]}
      </p>
    </div>
  );
}

function ExpandedView({
  result,
  timeFormat,
}: {
  result: PlanetaryHoursResult;
  timeFormat: "12h" | "24h";
}) {
  const { allHours, sunrise, sunset, nextSunrise, currentHour } = result;
  const weekday = sunrise.getDay();
  const dayHours = allHours.filter((h) => h.isDay);
  const nightHours = allHours.filter((h) => !h.isDay);

  return (
    <div className="mt-phi-3 pt-phi-3 border-t border-border">
      <div className="flex items-center justify-between mb-phi-3">
        <h4 className="text-foreground font-semibold text-sm font-display">
          Today's Planetary Hours
        </h4>
        <span className="text-muted-foreground text-xs">
          {PLANET_GLYPHS[result.dayRuler]} {DAY_NAMES[weekday]}
        </span>
      </div>

      {/* Day hours */}
      <p className="text-muted-foreground text-xs mb-1">
        Day Hours (sunrise {formatTime(sunrise, timeFormat)} — sunset {formatTime(sunset, timeFormat)})
      </p>
      <HourTable hours={dayHours} currentHour={currentHour} timeFormat={timeFormat} />

      {/* Night hours */}
      <p className="text-muted-foreground text-xs mb-1 mt-phi-3">
        Night Hours (sunset {formatTime(sunset, timeFormat)} — sunrise {formatTime(nextSunrise, timeFormat)})
      </p>
      <HourTable hours={nightHours} currentHour={currentHour} timeFormat={timeFormat} />
    </div>
  );
}

function HourTable({
  hours,
  currentHour,
  timeFormat,
}: {
  hours: PlanetaryHoursResult["allHours"];
  currentHour: PlanetaryHoursResult["currentHour"];
  timeFormat: "12h" | "24h";
}) {
  return (
    <div className="flex flex-col">
      {hours.map((hour, i) => {
        const isCurrent = hour.start.getTime() === currentHour.start.getTime();
        return (
          <div
            key={i}
            className={`flex items-center gap-2 py-1 px-1.5 rounded text-xs ${
              isCurrent ? "bg-muted" : ""
            }`}
          >
            <span className="text-muted-foreground w-5 text-right tabular-nums">
              {hour.hourNumber}.
            </span>
            <span className="text-primary w-4">{PLANET_GLYPHS[hour.planet]}</span>
            <span className="text-foreground w-16">{PLANET_NAMES[hour.planet]}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatTime(hour.start, timeFormat)} – {formatTime(hour.end, timeFormat)}
            </span>
            {isCurrent && (
              <span className="text-primary text-[10px] ml-auto">current</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/home/planetary-hours.tsx
git commit -m "feat: add PlanetaryHours component with compact and expanded views"
```

---

### Task 5: Integrate into home page

**Files:**
- Modify: `apps/web/src/routes/home.tsx`

- [ ] **Step 1: Add PlanetaryHours to the right column, after MoonCard**

In `apps/web/src/routes/home.tsx`, add the import and render the component:

```typescript
// Add import at top:
import { PlanetaryHours } from "@/components/home/planetary-hours";
```

In the right column div (the one with `style={{ flex: "1" }}`), insert `<PlanetaryHours />` between `<MoonCard />` and `<PlanetCard />`:

```tsx
<MoonCard />
<PlanetaryHours lat={sky.location.lat} lon={sky.location.lon} />
<PlanetCard chartData={sky.chartData} apiError={sky.apiError} retry={sky.retry} />
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck --workspace=apps/web
```

Expected: no type errors.

- [ ] **Step 3: Visual check — start dev server and verify**

```bash
npm run dev --workspace=apps/web
```

Open the app and verify:
- Planetary Hours card appears below Moon card
- Shows day ruler, current hour, progress bar, "next hour" line
- Click expands to show full 24-hour table
- Click again collapses

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/home.tsx
git commit -m "feat: integrate planetary hours card into home page"
```

---

### Task 6: Update changelog

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add at the top of `AGENT_CHANGELOG.md`:

```markdown
## 2026-04-08 — Planetary Hours card on home screen

### Change
Added a Planetary Hours card to the home screen right column, positioned below the Moon card. Shows the current planetary hour ruler, day ruler, a progress bar, and "next hour" preview. Clicking the card expands to show all 24 planetary hours (12 day + 12 night) with sunrise/sunset dividers.

### Files Created
- `apps/web/src/lib/planetary-hours.ts` — Pure calculation logic: Chaldean order, sunrise/sunset via suncalc, hour division
- `apps/web/src/lib/planetary-hours.test.ts` — Unit tests for calculation (24 hours, contiguous, Chaldean sequence, polar edge case, before-sunrise)
- `apps/web/src/components/home/planetary-hours.tsx` — React component with compact/expanded views

### Files Modified
- `apps/web/src/routes/home.tsx` — Added PlanetaryHours to right column after MoonCard
- `apps/web/package.json` — Added suncalc dependency

### Decisions Made
- **suncalc over custom sunrise/sunset** — 4KB package, battle-tested, handles edge cases. Planetary hours don't need Swiss Ephemeris precision.
- **Placed below MoonCard** — Both are "temporal awareness" cards (what's happening now), grouped by mental model rather than by "planetary" category.
- **Accordion expand over popover** — Consistent with card-based layout, doesn't obscure other content.
- **Calculate on page load only** — No real-time setTimeout updates. Future improvement tracked in `future_improvements.md`.
- **Null return for polar regions** — suncalc returns NaN for sunrise/sunset during polar day/night; card shows "unavailable" message.
- **Before-sunrise handled via yesterday's hours** — If current time is before today's sunrise, calculate from yesterday's sunset → today's sunrise.
```

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: add planetary hours changelog entry"
```
