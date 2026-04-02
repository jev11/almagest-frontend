# Agent Changelog

## 2026-04-02 — Golden Ratio Design System

### Change
Introduced golden ratio (φ = 1.618) proportions across the entire frontend: spacing, typography tokens, page layout columns, sidebar dimensions, and component sizing.

### Decisions Made

**Fibonacci spacing scale (base 5px):** Spacing tokens are Fibonacci numbers: 5, 8, 13, 21, 34, 55, 89px. Each step is ×1.618 of the previous. Chosen over base-4 because the values land on actual Fibonacci numbers — thematically fitting for an astrology app.

**Typography scale (base 15px):** Matches existing body text size. Scale: 9, 12, 15, 19, 24, 39, 63px. Intermediate steps use √φ for finer granularity. Line heights use Fibonacci numbers.

**Layout: 61.8/38.2 column split:** Home page and chart-view use `flex: 1.618` / `flex: 1` for content columns. Simple φ split chosen over nested recursive φ — cleaner to implement, easier to maintain.

**Sidebar: 89px / 144px:** Consecutive Fibonacci numbers (ratio = φ). Expanded width narrower than before (was 240px), requiring tighter nav item padding and truncated labels. "Free Plan" text removed from user area to save space.

**Additive tokens:** φ spacing utilities (`gap-phi-4`, `p-phi-3`, etc.) are added alongside existing Tailwind spacing — no existing utilities removed.

### Known Tradeoffs
- Sidebar at 144px expanded is noticeably narrower than the previous 240px. Nav labels must be short.
- Chart view right panel is now proportional instead of fixed 360px — on very wide screens it may be wider than needed.
- At tablet-portrait widths, the 38.2% right column may be cramped. Responsive breakpoints deferred to future polish.

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
