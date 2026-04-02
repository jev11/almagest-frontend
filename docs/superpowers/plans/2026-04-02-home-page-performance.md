# Home Page Performance Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Home page render instantly on every visit — no geolocation blocking, no redundant computation, cached data across navigations.

**Architecture:** Move sky data into a session-scoped Zustand store so it survives navigation. Remove the geolocation gate so approximate data renders immediately. Cache the user's location in localStorage for returning visits. Stop lazy-loading HomePage since it's the primary destination.

**Tech Stack:** React 18, Zustand, TypeScript, Vite, approx-engine

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/web/src/stores/sky-store.ts` | Session-scoped Zustand store for sky data + location cache |
| Modify | `apps/web/src/hooks/use-current-sky.ts` | Read/write from sky store instead of local state; remove geolocation gate |
| Modify | `apps/web/src/App.tsx` | Import HomePage directly (remove lazy) |
| Modify | `apps/web/src/components/home/moon-card.tsx` | Consolidate duplicate `calculateApproximate` calls |
| Modify | `apps/web/src/components/home/aspects-timeline.tsx` | Defer computation to after first paint |
| Test | `apps/web/src/stores/sky-store.test.ts` | Store logic tests |

---

### Task 1: Remove lazy loading for HomePage

The HomePage is `React.lazy()` loaded in `App.tsx:12`. Since it's the most-visited route, include it in the main bundle so there's zero network delay on navigation.

**Files:**
- Modify: `apps/web/src/App.tsx:12`

- [ ] **Step 1: Replace lazy import with direct import**

In `apps/web/src/App.tsx`, change:

```typescript
const HomePage = lazy(() => import("@/routes/home").then((m) => ({ default: m.HomePage })));
```

to:

```typescript
import { HomePage } from "@/routes/home";
```

Remove `HomePage` from inside the `<Suspense>` wrapper if it was the only reason for it (it isn't — other routes still need it, so leave `<Suspense>` in place).

- [ ] **Step 2: Verify the app builds**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds. HomePage is now part of the main chunk.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "perf: eagerly load HomePage — most visited route, no lazy split"
```

---

### Task 2: Create sky data store with location caching

Create a Zustand store that holds the current sky data in memory (session-scoped) and caches the user's geolocation in localStorage. This is the foundation — subsequent tasks will wire it up.

**Files:**
- Create: `apps/web/src/stores/sky-store.ts`
- Create: `apps/web/src/stores/sky-store.test.ts`

- [ ] **Step 1: Write the store test**

Create `apps/web/src/stores/sky-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useSkyStore } from "./sky-store";
import type { ChartData } from "@astro-app/shared-types";

// Minimal stub satisfying the ChartData shape for testing
const STUB_CHART = { positions: {}, zodiac_positions: {}, aspects: [], houses: {} } as unknown as ChartData;

describe("sky-store", () => {
  beforeEach(() => {
    useSkyStore.setState(useSkyStore.getInitialState());
    localStorage.clear();
  });

  it("starts with no chart data and not ready", () => {
    const state = useSkyStore.getState();
    expect(state.chartData).toBeNull();
    expect(state.ready).toBe(false);
  });

  it("setChartData marks store as ready", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    const state = useSkyStore.getState();
    expect(state.chartData).toBe(STUB_CHART);
    expect(state.ready).toBe(true);
  });

  it("preserves existing data when setLocation is called", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    useSkyStore.getState().setLocation(40.7, -74.0);
    expect(useSkyStore.getState().chartData).toBe(STUB_CHART);
  });

  it("setLocation persists to localStorage", () => {
    useSkyStore.getState().setLocation(40.7, -74.0);
    const cached = JSON.parse(localStorage.getItem("astro-cached-location") ?? "null");
    expect(cached).toEqual({ lat: 40.7, lon: -74.0 });
  });

  it("reads cached location from localStorage on creation", () => {
    localStorage.setItem("astro-cached-location", JSON.stringify({ lat: 48.8, lon: 2.3 }));
    // Re-create store state from initial
    useSkyStore.setState(useSkyStore.getInitialState());
    const state = useSkyStore.getState();
    expect(state.location.lat).toBe(48.8);
    expect(state.location.lon).toBe(2.3);
  });

  it("isStale returns true when no data", () => {
    expect(useSkyStore.getState().isStale()).toBe(true);
  });

  it("isStale returns false right after setting chart data", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    expect(useSkyStore.getState().isStale()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/src/stores/sky-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `apps/web/src/stores/sky-store.ts`:

```typescript
import { create } from "zustand";
import type { ChartData } from "@astro-app/shared-types";

const LOCATION_CACHE_KEY = "astro-cached-location";
const DEFAULT_LAT = 51.5074; // London
const DEFAULT_LON = -0.1278;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLocation {
  lat: number;
  lon: number;
}

function readCachedLocation(): CachedLocation {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedLocation;
      if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
        return parsed;
      }
    }
  } catch {
    // Corrupted cache — ignore
  }
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

interface SkyStore {
  chartData: ChartData | null;
  location: CachedLocation;
  ready: boolean;
  apiError: boolean;
  updatedAt: number | null;

  setChartData: (data: ChartData) => void;
  setLocation: (lat: number, lon: number) => void;
  setApiError: (error: boolean) => void;
  reset: () => void;
  isStale: () => boolean;
}

export const useSkyStore = create<SkyStore>()((set, get) => ({
  chartData: null,
  location: readCachedLocation(),
  ready: false,
  apiError: false,
  updatedAt: null,

  setChartData: (data) => set({ chartData: data, ready: true, updatedAt: Date.now() }),

  setLocation: (lat, lon) => {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lon }));
    set({ location: { lat, lon } });
  },

  setApiError: (error) => set({ apiError: error, ready: true }),

  reset: () => set({ chartData: null, ready: false, apiError: false, updatedAt: null }),

  isStale: () => {
    const { updatedAt } = get();
    if (updatedAt === null) return true;
    return Date.now() - updatedAt > STALE_MS;
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run apps/web/src/stores/sky-store.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/stores/sky-store.ts apps/web/src/stores/sky-store.test.ts
git commit -m "feat: add sky-store — session-scoped Zustand store with location caching"
```

---

### Task 3: Refactor useCurrentSky to use sky-store

Replace the local state in `useCurrentSky` with the centralized sky-store. Remove the geolocation gate so approximate data renders immediately. On subsequent navigations, skip computation if data is fresh.

**Files:**
- Modify: `apps/web/src/hooks/use-current-sky.ts`

- [ ] **Step 1: Rewrite useCurrentSky**

Replace the entire contents of `apps/web/src/hooks/use-current-sky.ts` with:

```typescript
import { useEffect, useCallback, useRef } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { useAstroClient } from "@astro-app/astro-client";
import { useSkyStore } from "@/stores/sky-store";

export type { CurrentSkyState } from "./use-current-sky-types";

export function useCurrentSky() {
  const client = useAstroClient();
  const store = useSkyStore();
  const locationRef = useRef(store.location);
  locationRef.current = store.location;

  // 1. If store already has fresh data, skip everything
  // 2. Otherwise, calculate approximate immediately with cached/default location
  useEffect(() => {
    if (!store.isStale()) return;

    try {
      const approx = calculateApproximate(
        new Date(),
        store.location.lat,
        store.location.lon,
      );
      store.setChartData(approx);
    } catch {
      // approx failure; precise fetch may still succeed
    }
  }, []); // Run once on mount — location is already in store

  // Resolve geolocation in background, update store if it differs
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const current = useSkyStore.getState().location;
        // Only update if location actually changed (avoids re-render churn)
        if (
          Math.abs(current.lat - latitude) > 0.01 ||
          Math.abs(current.lon - longitude) > 0.01
        ) {
          store.setLocation(latitude, longitude);
          // Recalculate with real location
          try {
            const approx = calculateApproximate(new Date(), latitude, longitude);
            store.setChartData(approx);
          } catch {
            // ignore
          }
        }
      },
      () => {
        // Permission denied or error — keep cached/default location
      },
      { timeout: 5000 },
    );
  }, []); // Run once on mount

  // Fetch precise data from API in background
  const fetchPrecise = useCallback(async () => {
    const now = new Date();
    const { lat, lon } = locationRef.current;
    store.setApiError(false);
    try {
      const response = await client.calculateNatal({
        datetime: now.toISOString(),
        latitude: lat,
        longitude: lon,
      });
      store.setChartData(response);
    } catch {
      store.setApiError(true);
    }
  }, [client, store]);

  useEffect(() => {
    if (!store.isStale()) return;
    void fetchPrecise();
  }, [fetchPrecise, store]);

  return {
    chartData: store.chartData,
    location: store.location,
    ready: store.ready,
    apiError: store.apiError,
    retry: () => void fetchPrecise(),
  };
}
```

- [ ] **Step 2: Extract the CurrentSkyState type to its own file**

The type `CurrentSkyState` is imported by several components (`chart-wheel.tsx`, `aspect-grid.tsx`, `planet-card.tsx`). Move it so the hook can re-export it cleanly.

Create `apps/web/src/hooks/use-current-sky-types.ts`:

```typescript
import type { ChartData } from "@astro-app/shared-types";

export interface CurrentSkyState {
  chartData: ChartData | null;
  location: { lat: number; lon: number };
  ready: boolean;
  apiError: boolean;
  retry: () => void;
}
```

- [ ] **Step 3: Verify the app builds and runs**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds. No type errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev --workspace=apps/web`

Verify:
1. Home page loads instantly — chart wheel appears with approximate data (no 5-second skeleton wait)
2. Navigate to Settings → navigate back to Home → widgets appear immediately (data cached in store)
3. If geolocation is allowed, chart quietly updates with precise position after a moment

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-current-sky.ts apps/web/src/hooks/use-current-sky-types.ts
git commit -m "perf: remove geolocation gate + cache sky data in Zustand store"
```

---

### Task 4: Consolidate MoonCard duplicate calculations

`MoonCard` calls `calculateApproximate(now, 0, 0)` twice with identical inputs in separate `useState` initializers.

**Files:**
- Modify: `apps/web/src/components/home/moon-card.tsx:17-27`

- [ ] **Step 1: Merge the two useState calls into one**

In `apps/web/src/components/home/moon-card.tsx`, replace lines 17–27:

```typescript
export function MoonCard() {
  const [now] = useState(() => new Date());
  const [elongation] = useState(() => moonPhaseAngle(now));
  const [moonZp] = useState(() => {
    const approx = calculateApproximate(now, 0, 0);
    return approx.zodiac_positions[CelestialBody.Moon];
  });
  const [moonSpeed] = useState(() => {
    const approx = calculateApproximate(now, 0, 0);
    return approx.positions[CelestialBody.Moon]?.speed_longitude ?? 13;
  });
```

with:

```typescript
export function MoonCard() {
  const [now] = useState(() => new Date());
  const [elongation] = useState(() => moonPhaseAngle(now));
  const [{ moonZp, moonSpeed }] = useState(() => {
    const approx = calculateApproximate(now, 0, 0);
    return {
      moonZp: approx.zodiac_positions[CelestialBody.Moon],
      moonSpeed: approx.positions[CelestialBody.Moon]?.speed_longitude ?? 13,
    };
  });
```

No other changes — the rest of the component uses `moonZp` and `moonSpeed` identically.

- [ ] **Step 2: Verify the app builds**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/home/moon-card.tsx
git commit -m "perf: consolidate duplicate calculateApproximate call in MoonCard"
```

---

### Task 5: Defer AspectsTimeline computation to after first paint

The `AspectsTimeline` runs 40 `calculateApproximate` calls synchronously inside `useMemo` during render. While each call is fast (~1ms), the total ~40ms blocks the main thread during the initial paint. Move the computation to a `useEffect` so the rest of the Home page (chart wheel, moon card, planet card) paints first, and the timeline fills in after.

**Files:**
- Modify: `apps/web/src/components/home/aspects-timeline.tsx:270-287`

- [ ] **Step 1: Replace useMemo with useEffect + state for the bars computation**

In `apps/web/src/components/home/aspects-timeline.tsx`, change the `AspectsTimeline` component (starting at line 270) from:

```typescript
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
```

to:

```typescript
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

  const [bars, setBars] = useState<AspectBar[]>([]);

  useEffect(() => {
    // Defer heavy computation so above-the-fold widgets paint first
    const id = requestAnimationFrame(() => {
      setBars(computeAspectBars(today));
    });
    return () => cancelAnimationFrame(id);
  }, [today]);
```

Also add `useState` to the import at the top of the file (line 1):

```typescript
import { useMemo, useState, useEffect } from "react";
```

- [ ] **Step 2: Add a loading state for the deferred bars**

Replace the `if (groups.length === 0)` block (line 302) with a check that also handles the initial empty state:

```typescript
  if (bars.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-foreground font-semibold text-sm mb-4">Aspects Timeline</h3>
        <div className="h-24 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }
```

This replaces the old "No major aspects" message. Since the deferred computation fills in within one frame (~16ms), the "Loading..." text is rarely visible — it's just a safety net.

- [ ] **Step 3: Verify the app builds and check visually**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

Run: `npm run dev --workspace=apps/web`
Verify: Home page chart wheel and cards appear first. Aspects timeline fills in a moment later (imperceptible in practice).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/aspects-timeline.tsx
git commit -m "perf: defer AspectsTimeline computation to after first paint"
```

---

### Task 6: Update changelog

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Add entry to AGENT_CHANGELOG.md**

Append to `AGENT_CHANGELOG.md`:

```markdown

## 2026-04-02 — Home Page Performance Optimization

### Change
Optimize Home page load time: instant rendering on first visit, near-zero latency on return visits.

### Decisions Made

**Data caching approach (over component caching):**
Sky data (planet positions, aspects) is stored in a session-scoped Zustand store (`sky-store`). Navigating away and back to Home reuses cached data instead of re-computing. Data refreshes when stale (>5 minutes).

**Remove geolocation gate:**
Previously, all Home widgets waited for `navigator.geolocation.getCurrentPosition()` (up to 5-second timeout) before rendering anything. Now: render immediately with cached or default (London) coordinates. Geolocation resolves in background and updates in-place. User's location is cached in localStorage for future sessions.

**Eager HomePage loading:**
HomePage removed from React.lazy() code splitting. As the primary destination, it's included in the main bundle to eliminate chunk-fetch latency on navigation.

**Deferred AspectsTimeline:**
The 40-call `calculateApproximate` loop moved from synchronous `useMemo` to `useEffect` + `requestAnimationFrame`. Above-the-fold widgets (chart wheel, moon card, planet card) paint first; timeline fills in one frame later.

**MoonCard consolidation:**
Two identical `calculateApproximate(now, 0, 0)` calls merged into one.

### Known Tradeoff
- Chart may briefly show London-based positions before geolocation resolves (only on first-ever visit or if location permission is denied). The visual shift is minimal — planet longitudes barely change with location; only house cusps and ascendant shift.
- AspectsTimeline shows a brief "Loading..." placeholder before data arrives (~16ms, usually imperceptible).
```

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: add changelog entry for home page performance optimization"
```
