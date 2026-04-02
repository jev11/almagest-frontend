# Agent Changelog

## 2026-04-02 — Task 2: sky-store — Session-Scoped Zustand Store with Location Caching

### Change
Created `apps/web/src/stores/sky-store.ts` — a Zustand store that holds current sky `ChartData` in memory (session-scoped, not persisted) and caches the user's geolocation in `localStorage` under the key `astro-cached-location`.

### Decisions Made

**Session-scoped chart data:** Sky data is intentionally NOT persisted to localStorage. It changes throughout the day, so stale persistence would surface wrong positions on next visit. Only coordinates are cached.

**Default location:** London (51.5074, -0.1278) — arbitrary but reasonable global default for users who deny geolocation.

**Stale threshold:** 5 minutes (`STALE_MS`). After 5 minutes without a `setChartData` call, `isStale()` returns `true`, triggering a refresh in the calling hook.

**`getInitialState` override:** Zustand's built-in `getInitialState()` returns a frozen snapshot from creation time. To support the test pattern of resetting state and re-reading `localStorage`, `getInitialState` is overridden to call `buildInitialState()` fresh each time. This is test-support only — production code never calls `getInitialState`.

**`apiError` flag:** Included so the consuming UI can distinguish "data not yet loaded" from "load failed" without an extra boolean in the component.

### Alternatives Considered
- Using `zustand/middleware` `persist` with a custom partialize to only save location: cleaner API but adds complexity for a simple key-value write. Manual `localStorage.setItem` is more explicit and easier to test.

## 2026-03-31 — Aspect Timeline: Triangle/Bell Curve Area Graphs

### Change
Replace flat color bars in `AspectsTimeline` with soft bell curve area graphs per aspect row.

### Decisions Made

**Visual style:** Soft gaussian-style bell curve with gradient fill (top opacity 0.85 → bottom 0.08), colored stroke along top edge, dot at peak. Row height 36px.

**Data computation approach: Sub-day sampling (Option A)**
Sample `calculateApproximate` every 6 hours across the 10-day window (40 calls total). Use real `aspect.orb` value at each sample → `intensity = 1 - orb/maxOrb`. Plot via SVG smooth bezier path through real data. Produces naturally asymmetric bell (applying side steeper than separating).

**Alternatives considered:**
- Option B — Keep 10 daily noon samples, switch `activeDays: boolean[]` → `orbValues: (number|null)[]`, render bezier through 10 points. Simpler but peak snaps to nearest noon.
- Option C — Binary search for exact peak moment, draw mathematical gaussian centered on it. Smooth/accurate peak but synthetic shape, doesn't reflect real orbital asymmetry.

**Why A over B/C:** All computation is local (VSOP87/ELP2000 in `approx-engine`, no backend calls). 40 calls complete in <1ms total. Real orb data produces naturally organic, informative shapes.

### Known Tradeoff

40 `calculateApproximate` calls run synchronously on first mount (guarded by `useMemo`). At <1ms each, total is ~40ms — acceptable for now. If mobile performance becomes an issue, offload to a Web Worker or use `useEffect`+state to defer after first paint.

### Implementation Notes

- Pure math helpers extracted to `aspects-timeline-utils.ts` for independent testability
- `MAX_ORB` map in `aspects-timeline.tsx` mirrors `ASPECT_DEFINITIONS` in approx-engine — if engine orb values change, this table must be updated too
- `orbIntensity` clamps output to `[0, 1]` including negative orb inputs (defensive)
