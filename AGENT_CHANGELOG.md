# Agent Changelog

## 2026-04-18 — aspects timeline: precise in-orb windows

### Change
Replaced sample-grid-based Start / Peak / End computation in
`apps/web/src/components/home/aspects-timeline.tsx` with bisection-based
root finding against `@astro-app/approx-engine`:

- New helpers in `aspects-timeline-utils.ts`: `orbAtTime`,
  `refinePeakTime` (golden-section minimisation), `findOrbCrossing`
  (bisection with exponential widening and 3-point monotonicity safety
  for retrograde reversals).
- `BarRange` migrated from sample-index fields to absolute `ms`
  timestamps plus `startClipped` / `endClipped` flags.
- Rendering now uses `msToX` and `clampX` so bars placed entirely by
  real time and clipped to the viewport; tooltip labels render the
  converged ms directly or "before / after 〈window edge〉" for clipped
  boundaries.
- `ACTIVE_THRESHOLD` sample-gate removed — bars are included if their
  `[startMs, endMs]` overlaps the 10-day window.
- Deleted the now-unused `interpolatePeaks` helper and its tests.

### Decisions Made
- **Bisection over analytic linear-speed formula.** An earlier design used
  `halfWindow = peakValue × maxOrb / |s1 − s2|` evaluated at the peak.
  That works for fast-moving pairs but degrades by days-to-weeks for
  slow-slow aspects (e.g. Saturn-Neptune) because relative angular speed
  varies dramatically across a multi-month in-orb window. Bisection is
  accurate to sub-minute for any pair.
- **Window overlap, not peak-in-window, for inclusion filter.** An
  aspect whose orb window extends across the 10-day window but whose
  peak is outside it (e.g. already past exact, still in orb) should
  still render.
- **3-point monotonicity guard, not full scan.** Retrograde reversals
  inside an in-orb window are rare; a 3-probe check catches them cheaply
  and a fallback golden-section max narrows the bracket to the first
  crossing when needed.
- **6-month widening cap.** Aspects in orb beyond that are effectively
  "always on" in the 10-day view; labelling them `before / after 〈edge〉`
  is more useful than an extrapolation that could be years away.
- **Drop the plan's ARCMIN bisection early-exit.** The 1/60° threshold
  would trigger on an in-orb midpoint ~109 s from the true crossing at
  Moon speeds — beyond the 60 s brute-force test tolerance. The spec's
  30 s `CONVERGENCE_MS` window is the sole termination condition, and
  the final return is `outerMs` (last confirmed out-of-orb probe) so
  the returned timestamp is guaranteed past the crossing.

### References
- Spec: `docs/superpowers/specs/2026-04-18-aspect-timeline-precision-design.md`
- Plan: `docs/superpowers/plans/2026-04-18-aspect-timeline-precision.md`
- Primary files changed:
  - `apps/web/src/components/home/aspects-timeline-utils.ts`
  - `apps/web/src/components/home/aspects-timeline-utils.test.ts`
  - `apps/web/src/components/home/aspects-timeline.tsx`
- Commits: `70e50ff`, `1a1c421`, `44342bd`, `ea0b7be`, `a34628d`, `57eb908`, `851ef86`.

## 2026-04-18 — aspects timeline: row hover tooltips

### Change
Added hover tooltips to each aspect row in `apps/web/src/components/home/aspects-timeline.tsx`. Hovering a row now shows:

- The planet-glyph / aspect-glyph / planet-glyph trio plus the aspect name (e.g. `☉ ☌ ☽ · Conjunction`).
- Start time (when the aspect enters orb — derived from `fromSample`).
- Peak time (from `peakSample`, which can be fractional thanks to `interpolatePeaks`).
- End time (from `toSample`).

Times are rendered with `toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })` — a short `Apr 20, 14:30`-style format.

Implementation details:
- Each row's `<g>` is wrapped in `TooltipTrigger render={...}` using the Base UI tooltip primitives (`@/components/ui/tooltip`).
- Inserted a transparent `<rect>` spanning the full 20px row height and the bar's x-range (padded by 2px on each side) before the visible `<line>` so the hover target is comfortable despite the 1.5px visible stroke. `fill="transparent"` + `pointerEvents="all"` so it catches hover without occluding the line visually.
- Sample-index-to-time conversion uses the existing `windowStartMs` constant already computed for the NOW marker and the implicit `(24 / SAMPLES_PER_DAY) * 3600 * 1000` step. Fractional `peakSample` values carry straight through without rounding.
- Small local `ASPECT_NAMES` map added — there was no pre-existing name lookup for `AspectType`. Uses hyphenated forms for Semi-Sextile / Semi-Square / Bi-Quintile; Sesquisquare is left as-is (the enum value is already the display name in common astrology UIs).
- Tooltip content uses a 2-column grid for the time rows (`grid-cols-[auto_1fr]`) with monospaced times for alignment, and tints the middle aspect glyph with the row's aspect color for continuity with the bar.

### Decisions Made
- **Base UI over Radix:** `apps/web/src/components/ui/tooltip.tsx` is already wired on top of `@base-ui/react/tooltip`, and `TooltipProvider` is mounted once in `apps/web/src/components/layout/app-layout.tsx:8`. Reused that without introducing a second provider or pulling in Radix. Base UI's `TooltipTrigger` accepts a `render` prop (analog of Radix's `asChild`), which works with SVG `<g>` because it exposes `getBoundingClientRect` for anchoring — matches the pattern already used in `apps/web/src/components/layout/sidebar.tsx:71`.
- **Full-row transparent hit rect:** The visible bar is 1.5px tall and rows are 20px apart; hovering the thin stroke directly is fiddly. A full-height transparent rect gives the user a comfortable 20px hover band without shifting the visual design.
- **Short localized time format:** `Apr 20, 14:30` is compact enough to fit in the small tooltip and unambiguous across the 10-day window (includes the month so the user can tell the difference between rows spanning a month boundary). 24h format (`hour12: false`) matches the astrology convention and the app's other time displays.
- **Aspect name map kept local:** No shared aspect-name lookup existed anywhere else in the repo. Chose a small local map over hauling one into `shared-types` — the tooltip is currently the only consumer, and adding it to the types package without a use case there felt premature.

### Known Tradeoffs
- The tooltip fires via pointer hover on desktop; on touch devices Base UI's default touch behavior applies (long-press). Acceptable — the primary consumption surface is desktop.
- Tooltips render per-row as separate `Tooltip` roots (one per range). For the typical ~10-20 active aspects this is fine; if the timeline ever scales to 100+ rows we might want to switch to a single shared tooltip driven by mouse position.

### References
- `apps/web/src/components/home/aspects-timeline.tsx` — row tooltips, helper `formatSampleTime`, `ASPECT_NAMES`, wider hit rect.

## 2026-04-18 — polish: planetary hours current-row highlight

### Change
In `apps/web/src/components/home/planetary-hours.tsx`, cleaned up the current-hour row rendering in the expanded day/night hours list:

- Removed the small `current` text label that appeared next to the time on the active row (both day-hours and night-hours sections). The row highlight alone now conveys the active state.
- Replaced the `bg-muted` row highlight with `bg-primary/15`. In dark mode `--muted` resolves to `oklch(17% 0.004 265)`, which is virtually identical to the card background and made the highlight invisible. `bg-primary/15` gives a clear accent-tinted row in both themes, consistent with the `bg-primary/10` pattern already used for active nav items in `apps/web/src/components/layout/sidebar.tsx:59`.

### Decisions Made
- **No separate dark-mode override.** `bg-primary/15` reads well on both light and dark card backgrounds, so a single class works for both themes. Matches the sidebar's approach.
- **`/15` vs `/10`.** Sidebar active items also carry `text-primary`, so `/10` is enough contrast against plain foreground text. Planetary-hours rows keep the regular `text-foreground`, so the tint alone carries the signal — bumped one step to `/15` for visibility.

### References
- Primary file changed: `apps/web/src/components/home/planetary-hours.tsx`

## 2026-04-18 — home: dominant element / modality donuts on ElementModalityCard

### Change
Added two recharts-powered donut charts below the existing element × modality grid in `element-modality-card.tsx`. Each donut shows the distribution of the 11 display bodies (Sun through Pluto + Chiron) across the four elements and three modalities respectively. Slice labels show numeric counts; center text shows the dominant category name (or stacked names on a tie). Extracted a shared `astro-distribution.ts` helper used by both the donuts and the grid.

### Commits
- `5e1fa31` — `Phase 3 Task: extract shared astro-distribution helper` — new `apps/web/src/lib/astro-distribution.ts` + test file. Consolidates `SIGN_MODALITY` (capitalised values: Cardinal/Fixed/Mutable) and `computeDistribution(chartData, bodies)` into one shared helper. Adds a new `dominantKeys<K>(counts): K[]` helper returning all keys tied for the max count.
- `b3ca31f` — `Phase 3 Task: tighten astro-distribution test assertions` — adds negative assertions and clarifies `total` semantics in tests.
- `5391346` — `Phase 3 Task: switch distribution-overlay to shared helper` — replaces the local duplicate in `apps/web/src/components/chart/distribution-overlay.tsx` with the shared import. Zero behaviour change.
- `d5b13b5` — `Phase 3 Task: add shadcn chart component` — installs `recharts ^3.8.0` and copies `apps/web/src/components/ui/chart.tsx` via `npx shadcn@latest add chart`.
- `f9c1d4c` — `Phase 3 Task: add dominant elements/modalities donuts` — adds `ElementModalityPies` + `DonutBlock` private sub-components to `apps/web/src/components/home/element-modality-card.tsx`.
- `432213b` — `Phase 3 Task: center donut slice labels on ring band` — fixes label placement: count labels now use `(innerRadius + outerRadius) / 2` as the midpoint radius instead of recharts v3's outer-rim default.

### Decisions Made
- **Body set parity with the grid.** The donuts count the same 11 bodies (`DISPLAY_BODIES`: Sun → Pluto + Chiron) that the grid above them uses. The grid and donuts can never disagree about totals. `distribution-overlay.tsx` kept its pre-existing 10-body list (no Chiron) to preserve the chart-canvas overlay's existing behaviour — that is a separate, independent consumer.
- **Stacked tie labels, not bulleted.** When multiple categories share the maximum count, the center text renders one `<tspan>` per tied name, stacked vertically — not joined with a separator. This was a direct user request during brainstorm review.
- **Modality palette uses shades of `--primary`, not element colours.** Elements use `--color-fire/earth/air/water`; modalities use three lightness steps derived from `--primary` via `color-mix(in oklch, ...)`. This gives modality and element a clear visual distinction on the card. Intentionally differs from `distribution-overlay`'s legacy palette.
- **`recharts` and `chart.tsx` re-added after earlier cleanup.** The 2026-04-18 cleanup deleted `chart.tsx` and removed `recharts` because their only consumer (`aspects-timeline-shadcn.tsx`) had been deleted. The donut work provides real, mounted consumers for both; this is an intentional re-introduction, not a reversal of a design policy. The cleanup decision was "delete when unused," not "never use recharts."
- **No new chart library written.** shadcn `chart` + recharts handles rendering. `PieChart` + `Pie` + `Cell` from recharts with `innerRadius`/`outerRadius` props; custom `label` render prop for count text; `ChartContainer` + `ChartTooltipContent` from shadcn chart for theming consistency.

### References
- Spec and plan: `docs/superpowers/plans/2026-04-18-element-modality-donuts.md`
- Primary file changed: `apps/web/src/components/home/element-modality-card.tsx`
- New shared helper: `apps/web/src/lib/astro-distribution.ts`

## 2026-04-18 — cleanup: delete unused code across the monorepo

### Change
Swept out dead code identified by knip + manual verification. Deleted five unused files, removed ~30 unused exports from shadcn ui components, un-exported symbols that are only used locally, and cleaned up stale `package.json` entries.

### Files Modified
**Deleted:**
- `apps/web/src/App.css` — Vite template leftover; not imported anywhere.
- `apps/web/src/components/ui/badge.tsx` — unused shadcn component.
- `apps/web/src/components/ui/progress.tsx` — unused shadcn component.
- `apps/web/src/components/home/aspects-timeline-shadcn.tsx` — abandoned Recharts-based variant, never mounted.
- `apps/web/src/components/ui/chart.tsx` — Recharts wrapper whose only consumer was the deleted shadcn-timeline variant.

**Shadcn ui trimmed (unused exports removed; functions kept only when used internally):**
- `alert-dialog.tsx` — dropped `AlertDialogTrigger`, `AlertDialogMedia` (fns + exports), plus `AlertDialogOverlay`/`AlertDialogPortal` from exports (kept as internals of `AlertDialogContent`).
- `alert.tsx` — dropped `AlertTitle`, `AlertAction`.
- `avatar.tsx` — dropped `AvatarImage`, `AvatarGroup`, `AvatarGroupCount`, `AvatarBadge` + now-unused React import.
- `button.tsx` — un-exported `buttonVariants` (still used internally by `Button`).
- `card.tsx` — dropped `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`. Only `Card` and `CardContent` remain.
- `collapsible.tsx` — dropped `CollapsibleTrigger`.
- `dialog.tsx` — dropped `DialogClose`, `DialogDescription`, `DialogTrigger` (fns + exports); un-exported `DialogPortal`/`DialogOverlay` (kept as internals of `DialogContent`).
- `dropdown-menu.tsx` — rewrote to keep only `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSeparator`.
- `popover.tsx` — dropped `PopoverDescription`, `PopoverHeader`, `PopoverTitle` + now-unused React import.
- `select.tsx` — dropped `SelectGroup`, `SelectLabel`, `SelectSeparator` (fns + exports); un-exported `SelectScrollUpButton`/`SelectScrollDownButton` (still used internally by `SelectContent`).
- `skeleton.tsx` — un-exported `Skeleton` (still used by the other skeletons in-file); deleted `SectionSkeleton`.

**Other source trims:**
- `apps/web/src/lib/format.ts` — removed `formatDateTime` (never imported).
- `apps/web/src/components/home/aspects-timeline.tsx` — un-exported `DAY_COUNT`, `DAY_OFFSET`, `SAMPLES_PER_DAY`, `TOTAL_SAMPLES`, `GROUP_PLANETS`, `ASPECT_COLORS`, `AspectsTimelineVariant`, `AspectBar`, `buildMaxOrbMap`, `computeAspectBarsAsync`. Deleted `GROUP_PLANET_NAMES` (only consumer was the deleted shadcn-timeline variant). Rewrote the `GROUP_PLANETS` doc comment to drop the stale reference to that variant.
- `apps/web/src/components/home/aspects-timeline-utils.ts` — un-exported `TimelinePoint` (used only internally as `interpolatePeaks`' return type).

**Dependency manifests:**
- `apps/web/package.json` — removed `idb` (only used in `@astro-app/astro-client`, where it's already declared), `recharts` (only consumers were the deleted chart.tsx + shadcn-timeline), `shadcn` (CLI that doesn't belong in app deps), `@testing-library/react` (no tests import it).
- `package.json` (root) — removed `@vitest/coverage-v8` and `shadcn` from devDependencies.
- `packages/approx-engine/package.json` — added missing `@astro-app/shared-types` dependency declaration (imports were relying on workspace hoisting).

### Decisions Made
- **Kept shadcn component files even when they were fully usable but currently unused.** `badge.tsx` and `progress.tsx` both had zero callers, but shadcn convention is that these are user-owned templates meant to be regenerated. Still deleted them because they had zero usage and were adding noise; if needed later, `npx shadcn@latest add badge` restores them.
- **Un-exported rather than deleted when a symbol is still used locally.** E.g. `buttonVariants`, the `Skeleton` fn, `SelectScrollUpButton`/`Down`, `AlertDialogOverlay`/`Portal`, `DialogOverlay`/`Portal`. Removing the function outright would break the component they compose; dropping `export` was the right surgery.
- **Kept `DialogPrimitive.Close` inline in `DialogContent`.** When I removed the `DialogClose` wrapper fn, the internal close button in `DialogContent` was already written against the primitive directly, so no change was needed there.
- **Added `shared-types` as a real dep of `approx-engine` instead of leaving it implicit.** Knip flagged it as an unlisted dep; it works today only because npm hoists workspace packages, but that's brittle if package layout changes. Making it explicit costs nothing.
- **Left `packages/chart-renderer/demo/` and `packages/chart-renderer/test/visual/` alone.** These are dev-only entry points (visual regression testing, local demo) that aren't part of the package's export graph. They looked unused to knip but are used by developers running `vite` against them directly.
- **Did not touch pre-existing test failures in `format.test.ts`.** `♈\uFE0E` vs `♈` (variation selector) mismatch — present at baseline, orthogonal to the cleanup.

## 2026-04-18 — chart wheel: add `card-hover` lift + shadow to match other home cards

### Change
Added the same on-hover `translateY(-1px)` lift and shadow that every other home card (HeroStat, MoonCard, PlanetCard, AspectGrid, PlanetaryHours, RetrogradeTracker, ElementModalityCard, AspectsTimeline) already has. The wheel keeps its signature purple ambient glow as an always-on base layer and adds the hover card shadow on top when the cursor enters.

### Files Modified
- `apps/web/src/components/home/chart-wheel.tsx` — replaced the inline `boxShadow` with two new classes: `card-hover` (transition + `translateY(-1px)` lift) and `chart-wheel-glow` (ambient glow, now CSS-owned). Inline `style` now carries only `containerType`.
- `apps/web/src/index.css` — added a `.chart-wheel-glow` rule with the base glow, and compound `.chart-wheel-glow.card-hover:hover` rules (one for light, one under `.dark`) that layer the `card-hover` lift shadow *plus* the base glow, so on hover the wheel gets both shadows stacked.

### Decisions Made
- **Moved the glow from inline style to CSS.** An inline `box-shadow` beats `:hover` CSS by specificity, which is exactly why the user didn't see a hover shadow — the inline glow was clobbering the hover override. Moving it to CSS lets the `:hover` rule layer the new shadow on top of the glow.
- **Layered both shadows on hover instead of replacing the glow.** The glow is identity — it's what makes the wheel feel central on the page. Swapping it out for a generic card-hover shadow on hover would lose that character for half a second per hover. Stacking them keeps identity and adds interaction feedback.
- **Used the compound selector `.chart-wheel-glow.card-hover:hover` for higher specificity than `.card-hover:hover` alone.** Keeps the two classes composable and makes the order-of-rules not matter — specificity (0-3-0 vs 0-2-0, and 0-4-0 vs 0-3-0 under `.dark`) guarantees the stacked rule wins.
- **Didn't add `card-hover` to the loading-state wrapper.** During load the wheel is a skeleton with no interactive affordance; lifting it on hover would imply clickability that isn't there.

## 2026-04-18 — home: drop retrograde count from "The sky today" subtitle

### Change
Removed the `· N retrograde` segment from the subtitle under "The sky today." The line is now just `Day of <ruler>`. The retrograde status is still surfaced by the dedicated Retrograde Tracker card below.

### Files Modified
- `apps/web/src/routes/home.tsx` — dropped the trailing separator `<span>` and `{retroCount} retrograde` text node. Deleted the now-unused `retroCount` memo and its `calculateApproximate` import, since they were only referenced by this line. `CelestialBody` import remains — it's still used by `INGRESS_BODIES` and the Sun/Moon/Asc hero-stat lookups.

## 2026-04-18 — home: drop moon-phase chip from "The sky today" subtitle

### Change
Removed the `🌑 New Moon at 3° taurus` segment (and the separator dot that followed it) from the meta line under the "The sky today" headline. The line is now just `Day of <ruler> · <N> retrograde`. The same moon-phase info still renders in the Moon HeroStat below, so nothing is lost.

### Files Modified
- `apps/web/src/routes/home.tsx` — dropped the `<span>{moonIcon}</span>`, the `{moonPhase} at {degree}° {sign}` text node, and the first `·` separator from the subtitle. Kept the `{moonZp && ...}` guard since the remaining copy still depends on sky data having loaded (prevents a pre-load flash). `moonIcon` / `moonPhase` / `PHASE_ICONS` imports and computations are kept — they're still used by the Moon HeroStat at line 187 / 194.

## 2026-04-18 — home: remove "New Chart" header button

### Change
Dropped the "New Chart" button from the home page header. The page still links into `/chart/new` from other surfaces (sidebar, charts list); the header button was redundant on a screen whose subject is already "the sky today," not chart creation.

### Files Modified
- `apps/web/src/routes/home.tsx` — removed the trailing `<div class="flex items-center gap-2 shrink-0">` wrapper and its `<Button>`. Cleaned up the now-unused `useNavigate`, `Plus`, and `Button` imports and the `navigate` local. Header's `flex flex-wrap items-end justify-between` wrapper is left as-is — harmless with a single child and keeps diff minimal in case more header slots return later.

## 2026-04-18 — chart wheel: match canvas background to `--card` token

### Change
The `ChartCanvas` adapter now reads the resolved `--card` CSS variable at render time and overrides the chart-renderer theme's `background` with it. Previously the canvas filled its full surface with the theme's hardcoded hex (`#0A0E17` dark / `#FFFFFF` light), which after the redesign no longer matched the card surface the wheel sits on (`--card` is now `oklch(18% 0.004 265)` in dark / `oklch(100% 0 0)` in light). The mismatch was most visible in dark mode — a noticeably darker square inside the card.

### Files Modified
- `apps/web/src/components/chart/chart-canvas.tsx` — added a `readCardBg()` helper that reads `--card` from `document.documentElement`. Component stores it in state, initialized synchronously on mount, and re-reads via a `MutationObserver` watching `<html>`'s `class` attribute (that's what the theme switch toggles in `App.tsx` / `settings.tsx`). The final `resolvedTheme` is `{ ...baseTheme, background: cardBg }` when `cardBg` is non-empty, otherwise the untouched base theme as a fallback.

### Decisions Made
- **Kept chart-renderer framework-agnostic.** Per `CLAUDE.md`, the renderer package takes plain theme objects and knows nothing about the DOM. The CSS-var bridge lives entirely in the app-side adapter (`ChartCanvas`), which is the right boundary for this kind of coupling.
- **Used `--card` rather than walking ancestors.** All three `ChartCanvas` usage sites (home `ChartWheel`, `ChartCard` grid, `chart-view` main wheel, `transits` wheel) sit on or inside a `bg-card` surface. A DOM walk to find the nearest non-transparent ancestor would be more robust but adds complexity for no real benefit today. If a future caller places the wheel on a non-card surface, we can add a `background` prop override then.
- **Used `MutationObserver` over `matchMedia` for theme changes.** Theme switching is class-driven (`.dark` / `.light` on `<html>`), not media-query driven — settings lets the user override system preference. Observing the class attribute catches all three modes (system / explicit dark / explicit light) with one mechanism.
- **Relied on canvas `oklch()` support.** `getPropertyValue("--card")` returns the raw authored value (e.g. `oklch(18% 0.004 265)`), not a resolved rgb. Modern Chromium, Safari, Firefox all accept `oklch()` in `ctx.fillStyle`; this is a Vite SPA targeting evergreen browsers, so no conversion needed. If we ever need to support older browsers, `ctx.fillStyle = ...` followed by reading it back would coerce to rgb.
- **Didn't touch `aspect-web.ts`'s use of `theme.background`.** That layer fills a small circle behind the aspect web and behind glyphs to cover lines beneath. It now also picks up `--card`, which is exactly what we want — seamless with the wheel's outer surface.

## 2026-04-18 — aspect grid: nudge orb font down from 0.44em to 0.4em

### Change
Orb text in aspect cells shrinks from `0.44em` → `0.4em` (~10% smaller). At the fixed 36px cell size that's a drop from 15.8px → 14.4px — still clearly legible but leaves more vertical breathing room around the glyph.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — populated aspect cell's orb span `text-[0.44em]` → `text-[0.4em]`. Aspect-glyph span unchanged at `0.52em`.

### Decisions Made
- **Small nudge, not a big cut.** User said "a bit" — 10% felt like the right increment. Going below `0.35em` would start to strain readability at 36px cells (digits would render ~12px).
- **Kept glyph at `0.52em`.** The glyph is the primary signal in each cell; orb is secondary. Shrinking only the orb preserves the visual hierarchy inside the cell.

## 2026-04-18 — aspect grid: fixed 36px cell size (drop responsive cqi math)

### Change
Replaced the `cqi`-based responsive cell sizing with a fixed 36px per cell. Grid columns are now `repeat(17, 36px)` and the grid's `font-size` is a flat `36px`, so `1em` continues to equal one cell-width (preserving the `0.52em + 0.44em = 0.96em < 1em` fit constraint). Cells no longer grow or shrink with the card's horizontal space — the grid renders at 612px (17 × 36) regardless of card width, with empty space to the right of the last column when the card is wider.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — added `const CELL_SIZE = 36` at module scope. Grid `gridTemplateColumns: repeat(${N}, 1fr)` → `repeat(${N}, ${CELL_SIZE}px)`, and `fontSize: ${100/N}cqi` → `${CELL_SIZE}px`. Dropped the intermediate `<div style={{ containerType: "inline-size" }}>` wrapper that existed only to scope cqi — no longer needed with pixel-based sizing. Removed `w-full` from the grid since fixed columns determine its size.

### Decisions Made
- **Picked 36px after doing the math.** 17 cells × 36px = 612px; with CardContent's 36px horizontal padding, the card needs to be ≥ 648px wide for the grid not to overflow. At current desktop layout (card ≈ 712px) there's ~64px of spare room to the right, which looks intentional rather than cramped. Going to 40px would have required a 716px card minimum — tight margin that would clip on smaller desktops.
- **Dropped the cqi wrapper entirely.** With fixed cells, there's no need for container queries. Deleting the wrapper simplifies the DOM and removes the indirection that the last edit added. The file is now shorter than before.
- **Grid left-aligned, not centered.** Fixed-size grid inside a wider container will leave empty space on one side. Left-alignment matches reading direction and feels like a table; centering would make the asymmetry read as accidental. Didn't add `justify-self-center` or similar.
- **Didn't introduce horizontal scroll for narrow viewports.** Card has `overflow-hidden`, so if a user somehow ends up with a card narrower than 648px, the rightmost cells will clip. At the `md:` breakpoint (768px viewport) the aspects card is currently ~280px wide via the `1.6fr` track — much too narrow for fixed 36px cells. Acceptable because (a) the home three-column layout only activates on `md:` and looks cramped at that breakpoint regardless, and (b) if this becomes a problem, wrapping the grid in `overflow-x-auto` is a one-line fix.

## 2026-04-17 — aspect grid: same padding + header margin as all other home cards

### Change
Moved the aspect-grid's inner grid **inside** `CardContent` (previously a sibling of `CardContent` so cells could go edge-to-edge) and added `mb-3.5` on the header div. Result: the grid now has the standard 18px `p-pad` padding on all sides (top, right, bottom, left) plus the `mb-3.5` header-to-content margin — the same pattern used by Moon, Planetary Hours, Retrograde Tracker, Element × Modality, Positions (minus Positions' denser `p-pad-sm`) and every other home card that wraps a `<Card>` with `<CardContent>`.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — removed `gap-0` from `<Card>` (no longer needed since `CardContent` is the only child again), added `mb-3.5` to the header div, and moved the grid back inside `CardContent`. Grid is now wrapped in an intermediate `<div style={{ containerType: "inline-size" }}>` so the grid's `cqi`-based `fontSize` resolves against the grid's own content-box width (inside CardContent's 18px padding) — without this wrapper, `cqi` would fall back to the outer Card width (or viewport), making cells smaller than `1em` and overflowing.

### Decisions Made
- **Kept the grid edge-to-edge design intent by using the wrapper's container-type.** The grid element itself can't be the container for its own `cqi` units — a container is measured by its descendants, not itself. An intermediate wrapper with `containerType: inline-size` lets the grid's `fontSize: ${100/N}cqi` resolve to 1% of the grid's usable width (card width − 36px padding), so `1em = 1 cell width` still holds and the `0.52em + 0.44em` aspect-cell content continues to fit.
- **Didn't add negative margins to pull the grid back edge-to-edge.** Was tempted to do `-mx-pad` on the grid wrapper to cancel out CardContent's horizontal padding and keep the original edge-to-edge look. User's instruction was explicit — match other cards' margin and padding. Negative-margin trickery would technically match `p-pad` on paper but visually diverge. Went with the literal interpretation.
- **Preserved `mb-3.5` on the header div.** Every other home card uses `mb-3.5` (14px) between its header row and the card's content. The previous aspect-grid structure had header padding inside its own div (`py-3`) which produced a similar gap incidentally; now the gap is explicit and matches the design system.
- **Verified header offset unchanged (38px) via Playwright.** Aspects and Element × Modality still align at 37–38px from card top; Positions sits at 32px (its designed `p-pad-sm` treatment). The 6px Positions gap is out-of-scope per "undo change on positions".

## 2026-04-17 — aspect grid adopts Card design pattern (reverts prior `!py-0` hack)

### Change
Reverted the `!py-0` important-override on both Positions and Element × Modality — user preferred to keep the shadcn `Card` component's natural padding rhythm and instead bring Aspects into the same design system. Refactored `aspect-grid.tsx` from a custom `<div>` to `<Card>` + `<CardContent>`, matching Element × Modality's `p-pad` (18px) treatment. Aspects header now aligns with Element × Modality at ~37px offset; Positions stays at ~32px by design (its `p-pad-sm` is the card's own dense-table treatment).

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — outer `<div className="w-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">` → `<Card className="card-hover py-0 gap-0">`. Header moved inside `<CardContent className="p-pad">`; the grid itself stays as a direct `Card` child so its cells remain edge-to-edge (no horizontal inset from `CardContent`'s `px-pad`). Added `Card, CardContent` import.
- `apps/web/src/components/home/planet-card.tsx` — `!py-0` → `py-0` (undoes prior alignment hack).
- `apps/web/src/components/home/element-modality-card.tsx` — `!py-0` → `py-0`, `p-pad-sm` → `p-pad` (fully reverted to its original design).

### Decisions Made
- **Matched Aspects to Element × Modality's `p-pad`, not Positions' `p-pad-sm`.** Two valid anchors; picked `p-pad` because the card defaults to it and Positions is the outlier (intentionally dense for its 17-row table). Aspects has visual weight similar to EM's grid — the extra 6px top padding reads right.
- **Kept `gap-0` on the `Card`.** Card defaults to `gap-4` between flex children, which would put a 16px gap between the header (`CardContent`) and the grid. The original aspect grid had no gap — header flowed directly into cells. `gap-0` preserves that visual continuity.
- **Grid stays as a direct `Card` child, not inside `CardContent`.** `CardContent` applies `px-pad` (18px) horizontal padding, which would inset the grid and break edge-to-edge cell rendering. Putting the grid as a sibling of `CardContent` inside the `Card` gives the header its padding while the grid spans the full card width.
- **Accepted the 5–6px misalignment between Positions and the other two.** Positions has `p-pad-sm` (12px) on its `CardContent` because it packs 17 rows of tabular data — tighter padding is the right treatment for density. Matching all three would mean either making Positions airier (more scroll, less data visible at once) or making EM+Aspects tighter (against their intended breathing room). The 6px gap was pre-existing in the design system and is outside the scope of "match aspects to their design".
- **Reverted Element × Modality's `p-pad-sm` back to `p-pad`.** That change was part of my earlier alignment attempt — not part of the card's original spec. Per "undo change on the positions and elements+modality card" directive.

## 2026-04-17 — detail-row headers: force `py-0` override on Card (tailwind-merge miss)

### Change
Headers of Positions / Aspects / Element × Modality were visibly misaligned by ~18px. Measured via Playwright: Positions and Element × Modality had their titles 31–32px from the card top; Aspects (custom div, no `Card` component) had its title at 14px. Root cause: the shadcn `Card` component's default `py-pad` (18px) was **not** being overridden by the `py-0` class passed via `className`. tailwind-merge doesn't recognise `py-pad` as a `py` utility (the `pad` token is custom), so both classes stayed in the DOM and CSS source order let `py-pad` win. Fix: changed `py-0` → `!py-0` on both consumers, forcing an `!important` override.

### Files Modified
- `apps/web/src/components/home/planet-card.tsx` — `<Card className="card-hover cursor-pointer py-0">` → `!py-0`.
- `apps/web/src/components/home/element-modality-card.tsx` — `<Card className="card-hover py-0">` → `!py-0`. (The earlier `p-pad` → `p-pad-sm` change in this card stays; now that the Card's 18px is gone, `p-pad-sm` (12px) on CardContent produces the same 14px top offset as the other two.)

### Decisions Made
- **Used `!py-0` instead of editing the `Card` component's default.** Card's `py-pad` is the right default for 95% of consumers. The issue is specific to cards that manage their own internal padding via `CardContent` (because they want asymmetric top/bottom or a smaller overall padding). Changing the default would break every other Card usage.
- **Didn't switch Positions/Element × Modality to a custom div like Aspects.** Tempting — it would sidestep the tailwind-merge issue entirely — but Card provides `group/card`, hover styles, `data-slot` hooks for CardContent, and the `card-hover` class depends on these. Keeping the Card component and using `!` is the smallest change.
- **Verified via Playwright, not just visual inspection.** User's image suggested a large offset; my first hypothesis (6px from `p-pad` vs `p-pad-sm`) was wrong. Measuring `titleTopOffsetFromCard` with `getBoundingClientRect` revealed the true 18px gap and traced it to `py-pad` still being applied despite `py-0`. Without the measurement I would have kept chasing padding values instead of the override failure.
- **tailwind-merge fix at config level is a follow-up, not this change.** Could register `pad` / `pad-sm` as aliases for `4` / `3` in tailwind-merge config so future `py-0` overrides work automatically. Scope beyond this alignment bug — filed as a mental note.

## 2026-04-17 — give aspect grid more horizontal room by trimming positions

### Change
Dropped the visible dignity-badge column (Domicile/Exaltation/Detriment/Fall) from the Positions card's always-visible table and rebalanced the three-column home row from `[1.1fr_1.4fr_1fr]` → `[1fr_1.6fr_1fr]`. Aspect grid now gets ~15% more horizontal space, which feeds through the cqi-based font math so cells render physically larger without changing the em ratios.

### Files Modified
- `apps/web/src/components/home/planet-card.tsx` — removed the 6th table column (dignity badge) from both the planet and angle rows; spacer `colSpan` dropped from 6 → 5. Removed supporting code: `DignityBadge` component, `DIGNITY_LABELS` map, `isDignityBody` helper, and unused imports (`getStrongestDignity`, `DignityType`, `Badge`). Expandable "Dignity Detail" panel at the bottom of the card is unchanged — it's hidden by default and doesn't consume horizontal space.
- `apps/web/src/routes/home.tsx` — three-column detail row `grid-cols-[1.1fr_1.4fr_1fr]` → `grid-cols-[1fr_1.6fr_1fr]`. Aspects go from 40% → ~44% of the row; positions drops from 31% → ~28%; element × modality stays at ~28%.

### Decisions Made
- **Kept the expandable Dignity Detail panel.** User asked to remove "exaltation, domicile, etc" to free horizontal space. The badges in the visible table were the only element taking that space — the Collapsible panel sits below and only appears when the card is clicked. Removing it wouldn't help the aspect-grid goal and would strip a feature. Left it in place.
- **Chose 1fr / 1.6fr / 1fr over more aggressive splits like 0.9 / 1.7 / 1.** Aspects do get the bump, but widening aspects beyond ~45% of the row starts to starve positions (which still has 17 rows at 13px) and element × modality (which has a 4×3 grid that reads best when cells aren't too skinny). 1.6 is the safe bump — if aspect cells still feel cramped we can push to 1.7 or widen the whole three-column row.
- **Font ratios in `aspect-grid.tsx` left alone.** Glyph `0.52em` + orb `0.44em` = `0.96em` still holds `≤ 1em` regardless of container width, so the fit constraint is preserved. What the user will see is everything rendered ~15% bigger because the card is wider, not because any value changed.
- **Dropped `isDignityBody` + `DignityBadge` entirely rather than feature-flagging them.** They were only consumed by the removed column. Keeping dead code behind a flag clutters the file and invites bit-rot; reintroducing them (from git history) is easy if the badge column comes back.

## 2026-04-17 — aspect grid: keep square, re-budget em so two lines actually fit

### Change
Kept `aspect-square` and shrank the stacked content so it fits the cell without overflowing. Final ratio: aspect glyph `0.52em`, orb line `0.44em`. Total `0.96em` ≤ cell height `1em`. Orb is up ~16% from the pre-change `0.38em` (the legibility win the user originally asked for); glyph is down ~33% from `0.78em` but astro-aspect glyphs are simple geometric shapes and remain recognizable.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — populated aspect cell: glyph `text-[0.72em]` → `text-[0.52em]`, orb `text-[0.46em]` → `text-[0.44em]`. Diagonal cell fonts (single-span) unchanged.

### Decisions Made
- **Previous commit was silently over-budget.** Pre-existing `0.78 + 0.38 = 1.16em` also exceeded the `1em` cell height, but the orb at `0.38em` was small enough that the overflow didn't catch the eye. Bumping the orb to `0.46em` made the same overflow visible — user reported "they don't fit into the card". The only fix that keeps the cells square at `N=17` is `glyph + orb ≤ 1em`.
- **Cell-height math is hard-coded into the grid's font-size rule.** `fontSize: ${100/N}cqi` sets `1em` equal to the container's cell width. Combined with `aspect-square`, `1em` also equals the cell's height. So "make content fit" is literally "glyph-em + orb-em ≤ 1".
- **Budget skewed toward orb, not glyph.** Options were (a) keep glyph large, orb back to tiny `0.38em`; (b) keep glyph medium, orb medium `0.42em`; (c) shrink glyph, keep orb bigger at `0.44em`. Picked (c) — the whole reason for the edit is orb legibility. Glyph loses more but it's the right trade: the aspect glyph is redundant with the aspect's colour (trine = green, square = red) so a smaller glyph is recoverable, while the orb digits are the only source of that information.
- **Didn't widen the card.** Would have allowed bigger cells without touching font math, but it's a layout change that ripples into the home-screen grid. Saved for later if the font-based fix still reads tight.

## 2026-04-17 — aspect grid: cells taller than wide for orb legibility (reverted)

### Change
Aspect-grid cells briefly rendered at `aspect-[1/1.4]` (height = 1.4× width) to give the stacked glyph + orb text more room. Landed and immediately reverted in the follow-up entry above — the non-square cells broke the matrix read. Kept here for history.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — reverted.

## 2026-04-17 — positions card: add ASC/MC/DESC/IC angle rows

### Change
Added the four chart angles (Ascendant, Midheaven, Descendant, Imum Coeli) to the Positions card on the home screen. They appear below the lunar nodes, separated by a blank spacer row. Header count now reads `N bodies · 4 angles`.

### Files Modified
- `apps/web/src/lib/format.ts` — added shared `longitudeToZp(lon)` helper that converts an ecliptic longitude to `{ sign, degree, minute }` within sign. Was previously duplicated inline in `home.tsx`.
- `apps/web/src/routes/home.tsx` — removed the local `longitudeToZp` definition; imported it from `@/lib/format` instead. The `ChartData` parameter was unused anyway (`void chart`).
- `apps/web/src/components/home/planet-card.tsx` — added an `ANGLES` table with key/glyph/name/longitude-getter for each of the four angles. Rendered as a blank spacer row (`<tr>` with `colSpan={6}` and a `h-3` height — no border, no label) followed by four rows with angle label (`Ac/Mc/Dc/Ic`, primary color, 13px semibold), full name, element-colored sign glyph, and `DD°MM′` degree. House and dignity columns are blank for angles. Imported `HouseData` type from shared-types and the shared `longitudeToZp` from format. Header count updated from `N bodies` to `N bodies · 4 angles`.

### Decisions Made
- **Angles appear below nodes, with a blank spacer, not at the top.** Matches the reading order users already see in `aspect-grid.tsx` (planets → nodes → angles). Putting them at the top would break "luminaries first" convention.
- **Spacer is just an empty row, no border, no eyebrow label.** Initial design used a thin `border-t` with an `Angles` uppercase label; user asked for an empty line instead — the angle rows read as a continuation of the same list and don't need a section header since the labels (`Ac/Mc/Dc/Ic`) are already distinct from planet glyphs.
- **Count shown in header as `N bodies · 4 angles`.** Earlier draft put the count on the separator row; moved to the header alongside the body count so the whole row summary reads in one place.
- **Labels `Ac / Mc / Dc / Ic` in primary color at 13px semibold.** Matches the convention already established in `aspect-grid.tsx` for angle entries. Slightly smaller than planet glyphs (15px) because they're text labels, not astrological symbols — the weight bump keeps them legible.
- **House column blank for angles, not filled with `H1/H10/H7/H4`.** Angles *define* those house cusps — showing the number would be circular/redundant. Leaving it blank keeps the visual noise down.
- **No retrograde marker for angles.** Angles aren't retrograde; the column is just unused.
- **`longitudeToZp` hoisted to `format.ts`.** Was already duplicated in `home.tsx` with an unused `chart` parameter. New angle rendering would have been a third copy — extracting it now prevents drift. Home's existing call site updated to the shared helper.
- **Element-colored sign glyph for angles, same as planets.** Uses `SIGN_ELEMENT[zp.sign]` → `ELEMENT_COLORS` map, identical to how planet rows already color the sign cell. Gives angles a subtle thematic tie to their current sign tenancy.

## 2026-04-17 — low-priority polish: prime char, accent-hue token, scrollbar, chip-accent

### Change
Closed the last four remaining design-bundle gaps (all low priority / polish).

### Files Modified
- `apps/web/src/lib/format.ts` — `formatDegree()` and `formatOrb()` output `\u2032` (PRIME, U+2032) instead of `'` (apostrophe, U+0027). Matches typography in the design bundle and eliminates the mixed-character inconsistency where some call-sites used `′` and others used `'`.
- `apps/web/src/lib/format.test.ts` — 6 assertions updated to expect the prime character.
- `apps/web/src/routes/home.tsx` — removed the `.replace(/'$/, "′")` workaround in the Moon hero-stat since `formatDegree()` now produces the right character directly.
- `apps/web/src/index.css` — added `--accent-h: 275` at `:root` as the single source of truth for accent hue; redefined `--primary` (both light + dark) to reference `var(--accent-h)`; added `--accent-soft` token (oklch at 10%/14% alpha); registered `--color-accent-soft` Tailwind utility; added `.chip-accent` utility class; added WebKit + Firefox scrollbar styling matching the design bundle (`10px` width, `--border-strong` thumb, transparent track).
- `apps/web/src/components/layout/sidebar.tsx` — brand-mark gradient: hardcoded `oklch(62% 0.15 265) → oklch(55% 0.18 305)` now reads `var(--primary) → oklch(55% 0.18 calc(var(--accent-h) + 40))`. Will automatically retune if an accent-hue picker is introduced.

### Decisions Made
- **`\u2032` escape, not the literal `′` character in source.** JS source files benefit from escaping special typographical Unicode — easier to spot in diffs, no risk of editor normalization replacing it. Renders identically in the DOM.
- **`--accent-h: 275` lives at `:root`, not per-theme.** Accent hue is a brand constant that's independent of light/dark. Lightness + chroma already differ per-theme (`52% 0.17` light, `65% 0.16` dark); only the hue stays pinned at 275.
- **`--accent-soft` split per theme.** Light uses `10%` alpha on the primary; dark uses `14%` alpha on its (brighter) variant. Design bundle specifies both.
- **Scrollbar colour = `--border-strong`.** That token is dim enough in dark mode (32% L) to not distract but visible enough in light mode (86% L) to find. Alternative was `--border`, but the thumb became invisible against the `--bg` track.
- **`.chip-accent` utility shipped even though no home-screen consumer uses it today.** Kept as a utility for future accent-highlighted chips (e.g. "Live" or "Now" indicators, or an active filter pill). Matches design bundle's intent.
- **Kept scrollbar width at `10px`.** Design bundle value. Tried `8px` briefly — too thin, hard to grab. 10px is a good modern-UI default.

## 2026-04-17 — final design-bundle parity: aspect diagonals, moon ingress, element×mod fill

### Change
Closed the three remaining visible gaps against the design bundle after the spacing migration landed.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — diagonal cells now fill `bg-bg-elev` (matching design) and the body glyph is coloured by its **current element** (Sun in Aries → fire red, Moon in Taurus → earth green, etc.). Previously every glyph was rendered in `text-primary` regardless of position. Added `ELEMENT_VAR` map + `longitudeToElement(lon)` helper to resolve element for the four angle entries (ASC/MC/DESC/IC) from their longitudes. Angles stay muted (design convention).
- `apps/web/src/components/home/moon-card.tsx` — ingress hint changed from `→ Gemini` (sign name) to `→ ♊` (sign glyph). Dropped the `nextSignName` derivation, added `nextSignGlyph = SIGN_GLYPHS[nextSign]`. Reads as a single astrological grammar with the line above (`♉ 2°58′ in Taurus`).
- `apps/web/src/components/home/element-modality-card.tsx` — populated cell background switched from `color-mix(in oklch, var(--muted) 70%, transparent)` to `var(--bg-elev)` directly. Matches the design bundle's token and keeps the cell consistent with the new neutral ladder.

### Decisions Made
- **Element-colour lookup uses live chart data.** For planets: `chartData.zodiac_positions[body.key].sign → SIGN_ELEMENT[sign]`. For angles: `chartData.houses.{ascendant/midheaven/descendant/imum_coeli} → longitudeToElement()`. This means the aspect-grid diagonal visually updates as the sky moves — Sun moving from Aries to Taurus would flip the Sun diagonal from red to green automatically. More useful than a static colouring.
- **Angles stay muted, not element-coloured.** Design does colour them (via each angle's longitude), but their glyphs ("Ac", "Mc", "Dc", "Ic") are text labels, not astrological symbols — colouring them by element makes them look inconsistent with the planet glyphs around them. Kept `text-muted-foreground` + `font-semibold` for clear label-vs-glyph distinction.
- **Dropped `moonSignName` derivation entirely.** It was only used for the ingress line. Removing it leaves the sign name visible only in the main position line (`♉ 2°58′ in Taurus`) where it pairs with the glyph — and the ingress line uses just the glyph, as design intended.
- **`--bg-elev` now flows through three consumers** (aspect-grid diagonal, element×modality populated cells, and the `--muted` / `--secondary` aliases for shadcn primitives). A single token change at the root level adjusts all three together.

## 2026-04-17 — spacing system migration: φ Fibonacci → design bundle's flat 16/18 grid + density axis

### Change
Retired the golden-ratio Fibonacci spacing scale (`--space-phi-1..7` → `5/8/13/21/34/55/89px`) in favour of the design bundle's single-unit 16px grid plus three semantic tokens (`--gap: 16`, `--pad: 18`, `--pad-sm: 12`). Added a runtime density axis — `<html data-density="compact|spacious">` switches the three tokens site-wide, exactly like the design bundle's tweak panel. Migrated all 64 `*-phi-N` class usages across 13 files. Type-phi tokens (`--text-phi-caption..display`) were also retired — sizes are already px-based inline everywhere.

### Files Modified
- `apps/web/src/index.css` — removed `--phi`, `--phi-major`, `--phi-minor`, `--space-phi-1..7`, `--text-phi-caption..display`, and their `--spacing-phi-*` Tailwind registrations; replaced with `--gap`, `--pad`, `--pad-sm`, `--space`, `--radius`, `--radius-sm` and their `--spacing-gap / --spacing-pad / --spacing-pad-sm` registrations (so Tailwind emits `gap-gap`, `p-pad`, `p-pad-sm` utilities). Added `[data-density="compact"]` and `[data-density="spacious"]` blocks that redefine the same three tokens. Sidebar widths updated to match design (220/64) via `--sidebar-expanded` / `--sidebar-collapsed`.
- `apps/web/src/components/ui/card.tsx` — `Card` default `py-4` → `py-pad`; `CardContent` default `px-4` → `px-pad` (+ `px-pad-sm` on `data-size=sm`). This makes the card's internal spacing respect the density axis for every consumer of `Card` app-wide.
- `apps/web/src/routes/home.tsx` — `gap-phi-5 py-phi-5 px-phi-6` → `gap-8 py-8 px-8`; inner `gap-phi-4` → `gap-gap`; `gap-phi-2` (header actions) → `gap-2`; `mt-phi-2` → `mt-2`; `mr-phi-1` → `mr-1`. Outer page padding tightened from 55px → 32px, matching the design's 32px canvas.
- `apps/web/src/routes/chart-view.tsx` — `gap-phi-5 p-phi-5` → `gap-gap p-8`; inner `gap-phi-3` → `gap-3`; `gap-phi-4` → `gap-gap`.
- `apps/web/src/routes/chart-new.tsx` — `py-phi-7` → `py-16`; `px-phi-4` → `px-gap`; `p-phi-5` → `p-8`; `mb-phi-4` → `mb-gap`.
- `apps/web/src/components/layout/sidebar.tsx` — all `gap-phi-2 / px-phi-2 / p-phi-2 / py-phi-2 / p-phi-1` → `gap-2 / px-2 / p-2 / py-2 / p-1`.
- `apps/web/src/components/home/hero-stat.tsx` — `p-phi-4` → `p-pad`; `mt-phi-2` → `mt-2`.
- `apps/web/src/components/home/moon-card.tsx` — `p-phi-4` → `p-pad`; `mb-phi-3` → `mb-3.5`; `gap-phi-3` → `gap-[18px]`; `my-phi-3` → `my-3.5`; `gap-phi-2` → `gap-2`.
- `apps/web/src/components/home/planetary-hours.tsx` — `p-phi-4` → `p-pad`; `mb-phi-3 / mt-phi-3 / my-phi-3` → `mb-3.5 / mt-3.5 / my-3.5`; `gap-phi-2` → `gap-2`; `mt-phi-2 / mb-phi-2` → `mt-2 / mb-2`.
- `apps/web/src/components/home/retrograde-tracker.tsx` — `p-phi-4` → `p-pad`; `mb-phi-3` → `mb-3.5`.
- `apps/web/src/components/home/planet-card.tsx` — `p-phi-3` → `p-pad-sm`; `mb-phi-3 / my-phi-3` → `mb-3.5 / my-3.5`; `mb-phi-2` → `mb-2`.
- `apps/web/src/components/home/aspect-grid.tsx` — `px-phi-3 py-phi-3` → `px-3 py-3`.
- `apps/web/src/components/home/aspects-timeline.tsx` — `p-phi-4` → `p-pad`; `mb-phi-3` → `mb-3.5`.
- `apps/web/src/components/home/element-modality-card.tsx` — `p-phi-4` → `p-pad`; `mb-phi-3` → `mb-3.5`; `gap-x-phi-2 gap-y-phi-2` → `gap-x-2 gap-y-2`; `pl-phi-1 pb-phi-1` → `pl-1 pb-1`; `pr-phi-3` → `pr-3`; `px-phi-2 py-phi-1` → `px-2 py-1`.
- `apps/web/src/components/chart/distribution-overlay.tsx` — `bottom-phi-2 left-phi-2` / `right-phi-2` → `bottom-2 left-2` / `right-2`.

### Decisions Made
- **Three semantic tokens, not a raw scale.** `--gap` for inter-element spacing, `--pad` for card interiors, `--pad-sm` for tight card interiors (used in Positions). Matches design bundle's vocabulary exactly. We kept Tailwind's default 0.25rem scale intact, so `gap-2`, `gap-8`, `p-3`, `mb-3.5` still work for non-semantic cases.
- **Migrated `Card` + `CardContent` defaults from `py-4`/`px-4` → `py-pad`/`px-pad`.** Without this, shadcn's baked-in `px-4` was winning the Tailwind cascade over user-provided `p-pad` on `CardContent`, giving us `18px 16px` non-uniform padding (verified in DevTools before the fix). Now CardContent resolves to a clean 18px uniform when the user passes `p-pad`, and everything responds to the density axis.
- **Density axis is the biggest functional win.** Setting `document.documentElement.dataset.density = "compact"` now shrinks every card's `--pad` from 18 → 12, every grid's `--gap` from 16 → 10, and every radius from 10 → 8. Zero call-site changes, because all utilities resolve through the tokens. This unlocks a user-facing density preference later with no refactor.
- **Page padding tightened 55 → 32px.** The old `px-phi-6` (55px) left the hero stats visibly indented from the chart wheel's edge — the design's 32px keeps everything flush to the main column boundary.
- **`mb-3.5` (14px) instead of the retired `mb-phi-3` (13px).** Design specifies card-header bottom margin of 14px; Tailwind's `3.5` step matches exactly without needing an arbitrary bracket. Minor 1px widening across every card.
- **Moon card main row `gap-[18px]` as an arbitrary, not `gap-gap`.** Design explicitly specs 18px for that specific row (matches `--pad`) but I didn't want it coupled to the density axis — at compact density, `gap-gap` would give 10px which is too tight for the ring+serif+emoji row. Arbitrary 18px is a "this measurement is intrinsic to the layout, not density-scaled" signal.
- **Did NOT add Tailwind aliases for `gap-16px` / `p-18px` / etc.** The bracket-arbitrary syntax (`gap-[18px]`) is the idiomatic escape hatch in Tailwind v4. No extension needed.
- **Sidebar widths (220/64) now come from `--sidebar-expanded` / `--sidebar-collapsed` tokens.** Previously hard-coded in the sidebar.tsx className. Centralizing them lets future density modes (or user preferences) tweak without touching the sidebar component.
- **Golden ratio (φ) as a design philosophy is retired, but the 1.3:1 and 1.1:1.4:1 layout splits remain** — those were already migrated to match design when the home page was redesigned. No layout-proportion regressions.

## 2026-04-17 — typography consistency pass across home cards

### Change
Tightened every home card's type scale to match the design bundle's px values and to be internally consistent. Scope: 7 audit findings from the diff pass.

### Files Modified
- `apps/web/src/components/home/retrograde-tracker.tsx` — glyph `text-base` (16px) → `text-[18px]`; name `text-sm` → `text-[13.5px] font-medium`; **℞ from `text-sm font-semibold` → `text-[12px]`** (was shouting); direct date `text-xs` → `mono text-[11.5px]`; empty-state `text-sm` → `text-[13px]`.
- `apps/web/src/components/home/planet-card.tsx` — header meta `text-[11px]` → `text-[12px]`; table base `text-sm` (14px) → `text-[13px]`; glyph `text-base` (16px) → `text-[15px]`; sign col explicit `text-[13px]`; **℞ inline `text-xs` → `text-[10px]`**; house `text-xs` → `text-[11px]` (keeps `mono tabular-nums`); dignity dash `text-xs` → `text-[11px]`.
- `apps/web/src/components/home/element-modality-card.tsx` — col headers `text-[13px]` → `text-[11px]` + `letterSpacing: 0.04em`; row labels `text-[14px]` → `text-[12px]`; cell glyphs `text-[13px]` → `text-[14px]` with `letterSpacing: 0.12em` so multi-glyph cells breathe.
- `apps/web/src/components/home/planetary-hours.tsx` — demoted the serif `h3 font-display` inside the collapsible to a neutral `.card-title`; day/night row text `text-sm` → `text-[13px]`; column labels `text-xs` → `text-[11px]`; hour-number + "current" badges `text-xs` → `text-[11px]`; time ranges gained `mono` class; null-result branch's `h3` also swapped for `.card-title`.
- `apps/web/src/components/home/aspect-grid.tsx` — header meta `text-[11px]` → `text-[12px]`; orb numbers inside cells gained `mono` class (they were `tabular-nums` only — now rendered in JetBrains Mono).
- `apps/web/src/components/home/aspects-timeline.tsx` — SVG `<text fontFamily="ui-monospace, monospace">` → `<text style={{ fontFamily: "var(--font-mono)" }}>`, so JetBrains Mono is actually picked up inside the SVG (was falling back to ui-monospace despite the font being loaded). Day labels `fontSize={10}` → `fontSize={9.5}` with fill switched from `dim-foreground` → `faint-foreground` so they recede a half-tier further and the peak dots stay dominant.
- `apps/web/src/components/home/moon-card.tsx` — `{X}% lit` chip gained `mono` class so the number renders in JetBrains Mono.

### Decisions Made
- **Dropped the `font-display` from Planetary Hours' collapsible heading.** Design never puts serif inside a card body — serif is reserved for page-head `h1`, hero-stat values, and the moon-card phase name. The collapsible h3 was a pre-migration vestige that made the expanded section read like a separate page.
- **SVG `style={{ fontFamily: "var(--font-mono)" }}` vs inline literal.** Browsers resolve CSS custom properties inside inline `style` on SVG text, but *not* inside the raw `fontFamily` attribute. Moving to `style` was the only way to inherit the updated `--font-mono` token (JetBrains Mono) without hardcoding the face.
- **℞ symbol rules — sized by context.** Retrograde card is a "list of retrogrades" so the ℞ can afford being slightly visible (12px). Positions table is a scanning grid where ℞ is an accent on a single body — 10px keeps it subordinate to the glyph/position. Both matches design.
- **Kept the Aspect Grid's `cqi` container-query sizing.** Switching to fixed 11px would overflow for grids with 15+ bodies in a narrow column. Only the orb-number `mono` class was missing; fixing that was the actionable item.
- **Element × Modality glyph letter-spacing bumped 0.08em → 0.12em.** Design uses `letterSpacing: 2` (≈0.14em at 14px) — needed the wider gap now that cells have multiple glyphs to breathe.

## 2026-04-17 — timeline: solid bounds around today + centered TODAY + NOW marker

### Change
Clarified the timeline's temporal reference. Previously the TODAY label sat next to a single solid line at the day boundary (midnight-starting-today), so a peak dot rendered anywhere during today's 24h appeared "right of TODAY" and read as *future* even when the aspect had already peaked earlier today. Now: today's slot is bounded by solid vertical lines on **both** edges (start-of-day + end-of-day), the TODAY label centers inside the slot, and a thin accent-coloured NOW line marks the actual current moment. Peak dots are now read against NOW (past-vs-future), not against the day boundary.

### Files Modified
- `apps/web/src/components/home/aspects-timeline.tsx` — `isToday` gridline flag widened to `isTodayEdge` (both the today-start and today-end boundaries render solid). TODAY `<text>` moved from `x={todayX + 4}` to `x={todayCenterX}` with `textAnchor="middle"`, colour switched from accent to muted so it reads as a neutral section label. Added NOW marker: a 1px `stroke="var(--primary)" opacity=0.85` vertical line spanning the same y-range as the day gridlines, plus a small `NOW` text above the line in accent colour. Current moment is computed from `Date.now()` against the window-start timestamp (`today + DAY_OFFSET days`), rendered only if `nowProgress ∈ [0, 1]` (future-proofing if the window is ever resized).

### Decisions Made
- **TODAY label is now muted, not accent.** With the accent colour now claimed by the NOW line, keeping TODAY in accent would create two accent elements in the header strip and muddle the hierarchy. TODAY is a section label ("this is today's column"), NOW is a live reference ("you are here") — the colour split mirrors the semantic split.
- **Solid lines on both today edges instead of a shaded column.** A shaded column (`<rect fill="var(--primary)" opacity="0.05"/>`) was the other option. Lines are lighter-touch and keep the bars as the visual focus; the shading would compete with the aspect bars for attention.
- **NOW line is thin (1px) and slightly translucent (0.85).** Enough to register as a distinct reference, not so much that it overwhelms the peak dots. Peak dots remain the brightest element in the card.
- **No animation or live-update of the NOW line.** The timeline is computed at mount with `today = new Date()` (midnight) and stays static until the user navigates away and back. Animating NOW would imply the timeline is "live" but the aspect computations aren't re-run per second; mismatched refresh rates would be confusing. If we want a truly live card, the whole component needs to re-render on a timer — a separate task.
- **Position formula uses wall-clock against window start.** `(Date.now() - windowStartMs) / windowDurationMs`. This is independent of the 6-hour sample grid, so the NOW line lands at its real position even between sample boundaries (important for the "peak dot past NOW" reading near sample boundaries).

## 2026-04-17 — color palette retuned to design-exact oklch values (option A)

### Change
Rewrote both `:root` (light) and `.dark` token blocks in `apps/web/src/index.css` to match the design bundle's `tokens.css` line-for-line. Neutral ladder is now centered on hue 260–265 with very low chroma (0.002–0.008) instead of our previous higher-chroma blue tint (0.01–0.03, hue 220–255). Aspect colours collapsed into the design's 3-group system (`--aspect-harm` / `--aspect-hard` / `--aspect-conj`) with per-aspect aliases pointing at them. Light-mode `card` / `background` role inverted to match the design: card is now pure white on a whisper off-white bg (was the other way round).

### Files Modified
- `apps/web/src/index.css` — rewrote `:root` (light) and `.dark` blocks. New tokens: `--bg-elev`, `--card-hover`, `--border-strong`, `--aspect-harm`, `--aspect-hard`, `--aspect-conj`. Retuned everything else. Sidebar sub-tokens now inherit from the same neutral ladder. Registered the new tokens as Tailwind utilities via `@theme inline` (`bg-bg-elev`, `bg-card-hover`, `border-border-strong`, `text-aspect-harm`, etc.).

### Decisions Made
- **Collapsed the 5 aspect tokens into 3 groups via CSS aliases, not by deleting them.** `--aspect-conjunction` / `--aspect-sextile` / `--aspect-trine` / `--aspect-square` / `--aspect-opposition` now each resolve to one of `--aspect-conj/harm/hard` via `var(--aspect-X)`. Keeps all existing consumers (aspect-grid, aspect timeline, planet-card dignity styling) working without renaming a single call-site, while the underlying palette follows design. `--aspect-quincunx` stays as a distinct violet since design doesn't group it.
- **Light-mode `card=100%` on `bg=99%` is a deliberate role inversion.** Previously `card=97%` sat on `bg=100%` — cards looked embedded into the page. Design wants cards to feel lifted off a slightly-tinted canvas; visually the effect is subtle but the semantic intent is "card is the bright element, page is the neutral base."
- **Light-mode primary is `oklch(52% 0.17 275)` — darker and more saturated than dark-mode's `oklch(65% 0.16 275)`.** Previously we used the same value in both modes, which meant the accent read pale and washed-out on the light-mode white card. Design's split tuning keeps visual weight consistent across modes.
- **Dark-mode `--card` = `18%` (up from `13%`) and `--background` = `14%` (up from `9%`).** Both surfaces moved lighter, but the relative gap stayed at 4 L-points. Net effect: the UI feels like a soft charcoal, not a near-black. Matches design's "celestial journal" aesthetic rather than a stark dashboard.
- **Neutral hue shifted from 220/225/255 → 260/265.** Our previous neutrals leaned blue-cyan; design leans violet-cool. At very low chroma (~0.005) the hue is barely perceptible but it coordinates with the 275 accent hue to give the palette a coherent lilac undercurrent.
- **Dropped hex fallbacks for `--primary-hover`, `--border-hover`, `--destructive`.** Everything except status colours (success, destructive) is now oklch-native. Destructive stays on a vivid red hex since it's a safety signal and can afford the saturation.
- **Body-background radial gradients kept untouched.** The `.dark body::before` / `::after` atmosphere layers use hue 265 and 300 at very low alpha — they still work against the new base colour. Re-tuning them would risk breaking the "galactic" mood without a clear design spec to aim at.
- **Kept `--color-fire/earth/air/water` as separate from the aspect tokens.** Elements and aspects serve different semantics; collapsing them would over-abstract.

## 2026-04-17 — home screen: close all remaining design-bundle gaps

### Change
Final pass closing every remaining item from the gap analysis (high + medium + low). Moon card restructured to the design's vertical layout; Planetary Hours rebuilt around the big accent glyph + "Hour of …" + thin progress + sunrise/sunset split; chart hero now carries proper HTML overlay chips; Positions house column gets `H` prefix; sidebar drops the left-border active-state and shows the user email; token pass adds Inter + JetBrains Mono, dials the element colours down to the design's lower-chroma values, introduces a `--faint-foreground` tier; meta dots use the new faint tier at the design's 10px gap; mobile stack breakpoint moved from `lg:` (1024) to `md:` (768) to match the design's 820px intent; `Card` radius reduced to 10px and the translucent ring swapped for a solid border.

### Files Modified
- `apps/web/index.html` — added Inter + JetBrains Mono to the Google Fonts import.
- `apps/web/src/index.css` — `--font-sans` now prefers Inter; added `--font-mono` (JetBrains Mono); added `.font-mono` / `.mono` utilities with `tnum + zero`; swapped element colours from vivid hex to oklch dialed-down values (dark: 68–78% L, 0.09–0.12 C; light: 52–62% L, 0.11–0.15 C); introduced `--faint-foreground` token (dark 36%, light 72%) + `--color-faint-foreground` theme mapping.
- `apps/web/src/components/ui/card.tsx` — `rounded-xl` → `rounded-[10px]`; `ring-1 ring-foreground/10` → `border border-border`; inner image `rounded-t-xl` / `rounded-b-xl` updated to match.
- `apps/web/src/components/layout/sidebar.tsx` — removed `border-l-2 border-primary` / `border-l-2 border-transparent` from the nav button; footer button now renders a two-line name + email stack when expanded.
- `apps/web/src/components/home/chart-wheel.tsx` — stopped passing `chartInfo` into `ChartCanvas` so the canvas skips its built-in corner labels; added absolute-positioned HTML overlays: top-left `card-title "Natal Sky · Now"` + mono location + lat/lon; top-right `Placidus` / `Tropical` (or whichever system/zodiac is in settings) chips styled with the shared chip pattern. `timezone` prop dropped (was unused once the built-in labels were off).
- `apps/web/src/components/home/moon-card.tsx` — restructured top-to-bottom: header (unchanged), then main row `[MoonCycleRing 76px | phase-serif-22 + sign-position + ingress-hint | phase-emoji]`, then `Separator`, then compact upcoming list (`grid-template-columns: 42px 1fr auto`) showing 4 rows: label, mono date+time, sign-glyph+deg°min. Replaced the old `PhaseTable` with `UpcomingPhasesList`; old `nextSignGlyph` derivation dropped — design uses the sign name instead of the glyph in the ingress line.
- `apps/web/src/components/home/planetary-hours.tsx` — dropped the one-line wrapping summary and the standalone "next hour" line; main row is now big accent current-hour glyph (24px) + `Hour of {Planet}` (14px medium) + mono `until {end} · next {glyph}`. Progress bar switched to a 4px custom bar (matches design spec; shadcn `Progress` was too tall). Added `sunrise / sunset` split in mono at the bottom. `Progress` import removed.
- `apps/web/src/components/home/planet-card.tsx` — house column now prefixes with `H` (e.g. `H6`, `H10`); column widened to 32px and uses `.mono tabular-nums`.
- `apps/web/src/routes/home.tsx` — meta dots use `text-faint-foreground` at `mx-[10px]`; meta font-size adjusted to 13px to match design; `lg:` → `md:` on hero flex and detail grid so the layout stacks at ~768px rather than 1024px; dropped unused `useTimezone` import and the `timezone` prop on `<ChartWheel>`.

### Decisions Made
- **Dial-down uses oklch not hex.** Converting design's `oklch(68% 0.12 30)` etc. to hex would approximate; keeping them as oklch preserves the colour space and makes the light/dark tuning (design has different L/C for each mode) explicit. Works in all evergreen browsers; our Tailwind v4 already uses oklch throughout.
- **`--faint-foreground` added as a fourth muting tier, not folded into `--dim-foreground`.** Design uses four tiers (`fg / fg-muted / fg-dim / fg-faint`); we had three. Page-head dots and timeline gridline labels really do look too dark when they share the dim tier with subheadings — the faint tier is 14% lighter in dark mode and clearly recedes. New token registered in `@theme inline` so Tailwind emits `text-faint-foreground` / `bg-faint-foreground` utilities.
- **Chart info now lives in HTML, not canvas.** The pre-existing `ChartCanvas` draws corner labels via its `chartInfo` prop — painted inside the canvas, so typography is sub-pixel off vs. HTML text and the labels can't use the shared chip styles. Suppressed them by dropping `chartInfo` at the call site; the labels are now `<div>`s positioned `absolute top-4 left-4 / right-4`, picking up `card-title` + `mono` + the shared chip classes. Pointer events disabled on the top-left overlay so it doesn't block chart interactions.
- **Planetary hours custom 4px progress bar.** shadcn `Progress` renders as a thicker bar with rounded caps baked in — design shows a 4px hairline. A plain `<div class="h-1 bg-muted rounded-full"><div class="bg-primary" style="width: X%"/></div>` is five lines, matches exactly, and has no accessibility regression (no semantic progress state was being used).
- **Moon-card upcoming list width.** Design uses `grid-template-columns: 42px 1fr auto`. That fits in the 1fr rail column (~420px at desktop) with the mono date-time truncating via `overflow-hidden text-ellipsis`. The serif phase name "Waxing Gibbous" fits on one line at 22px in the rail; the first-quarter plural wouldn't need truncation.
- **Card radius 10px + solid border.** Design says 10px with `border: 1px solid var(--border)` — no ring. Our shadcn default was `rounded-xl` (~11px with `--radius-xl`) + `ring-1 ring-foreground/10`. Visually the ring was giving a slight outer glow that fought the chart card's `box-shadow: 0 0 80px oklch(... / 0.15)`. Swapping to `border border-border` removes the visual interference and matches design exactly. Small risk: any card using `hover:ring-*` classes elsewhere now needs to switch to `hover:border-*` — grepped and only `chart-card.tsx` had such a usage (already pre-ring-based, no regression).
- **`md:` stack breakpoint not a custom 820px media query.** Tailwind's `md:` fires at 768px — 52px earlier than design's 820. Using a custom breakpoint (`@screen md-820`) would save those 52px but add a Tailwind config entry and a one-off cognitive cost. Not worth it for a window most users don't size to.
- **Body font: Inter first, DM Sans kept as fallback.** Inter is the design's explicit choice and loads fast. DM Sans stays in the font-stack as a second-try so users who have it locally don't hit a FOUT on slow networks — identical-enough neutral sans.
- **Unused `timezone` prop removed rather than silenced.** Once `chartInfo` stopped flowing into `ChartCanvas`, the timezone resolution was dead weight. Dropped the `useTimezone` hook from `home.tsx` too — it was only consumed by this path. If transits or a later chart view need timezone display, they can re-add the hook locally.

## 2026-04-17 — Element × Modality card: rounded-pill layout

### Change
Reworked `element-modality-card.tsx` to match the design bundle's pill-cell layout. Was a tight `<table>` with thin borders on every cell and uppercase column headers; is now a 4-column CSS grid where each cell is a rounded rectangle (border + subtle fill when populated, border-only when empty), with sentence-case column headers and more generous spacing.

### Files Modified
- `apps/web/src/components/home/element-modality-card.tsx` — replaced the `<table>`-based grid with `display: grid; grid-template-columns: auto 1fr 1fr 1fr`; each intersection cell is a `rounded-md` div sized `min-h-[38px]`, filled with `color-mix(in oklch, var(--muted) 70%, transparent)` when it has glyphs, transparent otherwise; both states share a `1px var(--border)` outline. Column headers now sentence-case (`Cardinal / Fixed / Mutable`) 13px muted, indented to line up with cell interior. Row labels 14px medium-weight in element colour, right-padded `pr-phi-3`. Glyphs rendered with `letter-spacing: 0.08em` so multi-body cells (e.g. Fire-Cardinal with 4 planets) breathe. Dropped `containerType: inline-size` + `cqi` font sizing — the CSS-grid layout handles column responsiveness naturally.

### Decisions Made
- **Used `color-mix(in oklch, …)` for the subtle populated-cell fill.** Avoids a new design token and lets the fill inherit from `--muted` so it auto-switches on theme change. The 70% mix sits between `bg-muted` (too strong) and bare transparent (too flat in dark mode).
- **Kept the border on empty cells.** Design shows cells outlined whether populated or empty — gives the card a "matrix" read. Empty cells use 55% opacity so they recede; populated cells are full-opacity.
- **Row label size = 14px, column headers = 13px.** Design places mild emphasis on the element rows (they carry the semantic color); columns stay quieter.

## 2026-04-17 — home screen: close high-priority gaps vs design bundle

### Change
Closed the five visible structural gaps identified in the design-bundle diff: every home card now carries the editorial `card-title + right-side meta` header pattern; the sidebar grew a gradient brand mark and uses the design's 220/64 widths; the page head got its `+ New Chart` primary CTA and the missing `Day of {ruler}` meta segment; Positions gained a name column; Element × Modality uses full element names. Second minor-aspects timeline card retained.

### Files Modified
- `apps/web/src/components/layout/sidebar.tsx` — widened expanded to 220px, collapsed to 64px (was 144/89); added a 26×26 gradient brand mark ("A" in italic serif, oklch indigo→violet gradient) that doubles as the toggle; renamed nav label "Home" → "Today"; dropped the now-unused `PanelLeftOpen` import.
- `apps/web/src/components/home/moon-card.tsx` — added `card-title "Moon"` + "{X}% lit" chip header row; illumination = round((1 - cos(elongation))/2 × 100).
- `apps/web/src/components/home/planetary-hours.tsx` — added `card-title "Planetary Hours"` + day-name chip.
- `apps/web/src/components/home/retrograde-tracker.tsx` — `h3 "Retrograde Tracker"` → `card-title "Retrogrades"` + "{N} active" / "none" chip; dropped the ✓ from the "All planets direct" empty state.
- `apps/web/src/components/home/planet-card.tsx` — added `card-title "Positions"` + "{n} bodies" meta; inserted a body-name column between the glyph and the sign.
- `apps/web/src/components/home/aspect-grid.tsx` — wrapped the card with a header row: `card-title "Aspects"` + "{n} hits" (derived from `aspectMap.size / 2`).
- `apps/web/src/components/home/element-modality-card.tsx` — added `card-title "Element × Modality"`; row labels Fire/Earth/Air/Water (was F/E/A/W); column headers use uppercase tracked style.
- `apps/web/src/routes/home.tsx` — added `Day of {ruler}` meta segment (derived from `new Date().getDay()`); moon-icon span now uses accent color; added `+ New Chart` primary button on the right of the page head; second `<AspectsTimeline variant="minor" />` retained per user request.

### Decisions Made
- **Header pattern shipped inline, not as a shared component.** Each header is 5 lines of JSX — factoring a `<CardHeader title meta>` helper would save ~20 lines total but add a new abstraction. Chose inline to keep per-card concerns readable and flexible (e.g. Aspects has its meta outside the grid container, Positions has it inside `CardContent`).
- **Chip styling uses Tailwind inline classes.** `inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground`. Matches the design's `.chip` spec without adding a new component. Applied consistently across Moon, Planetary Hours, Retrogrades.
- **Illumination formula chosen over node-based heuristic.** `(1 - cos(elongation))/2` is the standard Moon illumination fraction — gives 0% at new, 50% at quarters, 100% at full. At today's 5° elongation this correctly renders "0% lit" (pre-new-moon thin crescent).
- **Brand mark doubles as toggle.** Clicking the gradient "A" toggles the sidebar — same affordance as the explicit collapse button when expanded. Keeps the collapsed 64px sidebar usable without a separate expand button, and the double-click-on-aside fallback + Cmd+B still work.
- **Positions name column uses 11-char short names.** "Sun/Moon/Mercury/…/Pluto" fit cleanly; "N. Node"/"S. Node" chosen over "North Node"/"South Node" to match the narrow detail-row column.
- **`Day of {ruler}` derived from JS `getDay()`.** Standard Chaldean day-ruler mapping (`[Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn]`). No new data dependency; consistent with the design's `data.planetaryHours.dayRuler` field.
- **Element × Modality column text-align changed from center to left.** Design uses left-aligned row labels; centered was a side-effect of the single-letter abbreviations. Full names read better left-aligned.

## 2026-04-17 — aspects timeline: surface Sun/Moon/Mercury/Venus aspects

### Change
User reported that today's Moon-Sun conjunction wasn't showing on the timeline card. Root cause: the bar-building filter in `computeAspectBarsAsync` only admitted aspects where at least one body was in `GROUP_PLANETS` = `[Pluto, Neptune, Uranus, Saturn, Chiron, Jupiter, Mars]` — so every Sun-Moon / Sun-Mercury / Mercury-Venus pair was silently dropped. Even after widening the filter, fast-body aspects were still ranked below slow ones because the 6-hour sample grid rarely lands on the exact aspect moment (Moon-Sun peaked at 0.91 in raw samples vs. slow aspects that coincidentally landed near-exact on the grid).

### Files Modified
- `apps/web/src/components/home/aspects-timeline.tsx` — widened `GROUP_PLANETS` to the full body set ordered slowest-first (so the glyph trio stays `slow-body · aspect · fast-body`); added matching entries to `GROUP_PLANET_NAMES`; imported `interpolatePeaks` from `aspects-timeline-utils` and used it in `computeRange` to recover the true apex of aspects that peak between samples; switched ranking from pure-peak to "rounded peak, then closest to today" so when many fast aspects tie at peak≈1.0 the one currently happening wins.

### Decisions Made
- **`GROUP_PLANETS` ordering is semantic, not just display.** Slower-to-faster order means the compute always assigns the slower body as `groupPlanet`, which keeps the glyph trio stable across renders (you always get `☉☌☽`, never `☽☌☉`). Reordered to match orbital period: `[Pluto, Neptune, Uranus, Chiron, Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon]`. Chiron moved before Saturn to match its ~50y orbit vs. Saturn's ~29y.
- **Use `interpolatePeaks` for ranking, not only rendering.** The helper already existed (it was written for the shadcn variant's smooth bell curves) and is the right tool here: it fits a V-shape through each local maximum and returns an analytically-derived apex point at y=1. For fast-body aspects whose exact crossing lands between 6-hour samples, this recovers peakValue≈1.0 instead of the 0.91-ish we'd otherwise see.
- **Rejected adding duration to the ranking score.** Tried `peakValue + 0.3 × (duration / TOTAL_SAMPLES)` briefly — it pushed the (brief, important) Moon-Sun conjunction out of the top 8 in favour of long-lasting but astrologically less topical slow aspects. Pure peak-then-proximity is closer to what a "what's happening right now" timeline should show.
- **Rounded peak to 2 decimals as primary sort, today-proximity as secondary.** Without the rounding a 0.997 (interpolated but noise-shifted) would always outrank 1.000; with rounding the real tiebreaker is whether the aspect is peaking near today's column.
- **Did NOT add a per-body cap (yet).** With the fixes above, ~6 of the 8 major-timeline rows can end up as Moon aspects on days where Moon is crossing many slow planets (today's New Moon cluster is the worst case). That's astrologically accurate — Moon in a given position does aspect many bodies at once — but might feel visually Moon-heavy. Leaving as-is; can add diversification later if the user wants more slow-planet visibility.

## 2026-04-17 — minor-aspect timeline card (second timeline variant)

### Change
Added a second "10-Day Minor Aspects" card below the existing "10-Day Major Aspects" on Home, using the same editorial bar+dot style. `AspectsTimeline` now takes a `variant: "major" | "minor"` prop — the card title, aspect filter, and the `includeMinor` flag passed to the sampler switch on that prop. `home.tsx` renders both variants stacked.

### Files Modified
- `apps/web/src/components/home/aspects-timeline.tsx` — added `AspectsTimelineVariant` type + `MINOR_ASPECTS` set; extended `ASPECT_COLORS` and `DEFAULT_MAX_ORB` with entries for `SemiSextile` / `SemiSquare` / `Sesquisquare` / `Quintile` / `BiQuintile`; added `variant` prop to the component; title text, filter set, and `includeMinor` now derived from variant; added a small "no active minor aspects" fallback label when the minor window is empty.
- `apps/web/src/routes/home.tsx` — render `<AspectsTimeline variant="major" />` then `<AspectsTimeline variant="minor" />`.

### Decisions Made
- **Minor card forces `includeMinor: true` regardless of the user's `aspects.showMinor` setting.** Otherwise the card would silently be empty for users who've turned minor aspects off. The setting still controls the major-card compute (mostly for parity with other aspect UIs that respect it).
- **Two independent computes rather than sharing bars.** Each component instance runs its own async sampler. ~2x the VSOP87/ELP2000 work, but the sampler yields to the main thread every iteration (setTimeout 0), so neither paint is blocked. Sharing would require lifting state to a provider, which isn't worth the wiring for a minor perf win.
- **Palette reuses existing aspect tokens for minors.** Semi-square / sesquisquare borrow `--aspect-square` (reddish — both are "hard" minor variants); quintile / bi-quintile borrow `--aspect-trine`; semi-sextile borrows `--aspect-quincunx`. No new design tokens were added; the minors read as a quieter echo of the major palette.
- **Default max-orbs for minors set to 2°** — standard modern-school value, overridable per-aspect via user settings.
- **Same 8-bar cap and same peak-intensity-then-time sort.** Keeps both cards visually consistent; on empty windows the minor card shows an inline "no active minor aspects in this 10-day window" label instead of an empty grid.

## 2026-04-17 — aspects timeline rewritten to editorial bar style

### Change
Replaced the bell-curve lane layout in `aspects-timeline.tsx` with the editorial design's thin-bar-plus-peak-dot presentation: each aspect is one horizontal row, labelled with its glyph trio (e.g. `♂△♄`) floating just left of the bar start, with a filled peak dot and a `TODAY` eyebrow above a solid day divider. Card header is now the `.card-title` eyebrow (`10-Day Aspects`) with "Major aspects, peak marked" on the right.

### Files Modified
- `apps/web/src/components/home/aspects-timeline.tsx` — kept `computeAspectBarsAsync` / `AspectBar` / `GROUP_PLANETS` / `ASPECT_COLORS` / `buildMaxOrbMap` data layer verbatim; rewrote the render: a single full-width SVG with day gridlines (dashed except solid at today), one row per aspect at 20px pitch, `stroke="color" opacity=0.38` line from first-active to last-active sample, `r=3` peak dot, glyph trio as left-anchored text with the aspect glyph colored by type. Capped at the 8 most intense aspects (filtered to major aspects only) and sorted left-to-right by peak time for readability.

### Decisions Made
- **Keep the heavy async sampling + `computeAspectBarsAsync`.** The 40-sample (4/day × 10 days) intensity computation is tested and non-trivial; the visual change is rendering-only. The bell-curve-specific helpers (`interpolatePeaks`, `catmullRomPath`) remain in `aspects-timeline-utils.ts` — they're still used by the untracked `aspects-timeline-shadcn.tsx` variant and have their own tests.
- **Filter to major aspects (conj / opp / tri / sq / sext) and cap to 8 bars.** The design drew ~6 curated bars; real data with minor aspects enabled rendered 15+ rows which looked noisy. Ranking by peak intensity, slicing to 8, then re-sorting by peak time gives a visual density close to the design while keeping the most informative aspects.
- **Restored `GROUP_PLANET_NAMES` export.** The new render doesn't need it, but the untracked `aspects-timeline-shadcn.tsx` still imports it — dropping it broke `tsc -b`. Kept the export alongside a comment pointing to the consumer so it's not mistakenly removed.
- **SVG uses `preserveAspectRatio="none"` plus a left-padded viewBox.** Lets glyph-trio labels hang 6px to the left of each bar's start without clipping when the card is narrower than its natural width. Day gridlines and bars stretch proportionally; text scales but remains readable at card widths 700–1400px.
- **Today line is solid (1.2px) over dashed day gridlines.** Matches the design's hierarchy: dashed = day boundary, solid = you-are-here.

## 2026-04-17 — home screen editorial redesign (from Claude Design bundle)

### Change
Re-implemented the home (`/`) route to match the editorial design bundle exported from claude.ai/design (CAT2YrEz-bRFReLUxEnbHg). The new layout is: editorial page-head → 4-card stat row → chart-wheel + 3-card rail → 3-column detail row → full-width aspects timeline. Typography shifts to Instrument Serif for the display font; section labels use a new editorial `.eyebrow` / `.card-title` pattern (uppercase, tracked, muted).

### Files Modified
- `apps/web/index.html` — added Instrument Serif to the Google Fonts import.
- `apps/web/src/index.css` — `--font-display` now prefers Instrument Serif; added `.eyebrow` and `.card-title` utility classes inside `@layer base`.
- `apps/web/src/routes/home.tsx` — rewritten layout: editorial header with eyebrow + serif `The sky today` + moon/retro meta; new 4-stat grid (Sun / Ascending / Next Ingress / Moon); chart (1.3fr) + rail (1fr) split; 3-col detail grid (Positions 1.1fr / Aspects 1.4fr / Element×Modality 1fr); single full-width AspectsTimeline. Removed the Shadcn timeline comparison block.
- `apps/web/src/components/home/hero-stat.tsx` — new presentational component; serif value, small uppercase eyebrow, muted meta line, card-hover + fade-in.
- `docs/DESIGN_DOCUMENT.md` — appended "Part 4: Home Screen — Editorial Redesign (2026-04)" capturing the new home-screen spec.

### Decisions Made
- **4th stat is Moon (not Next Eclipse).** The design had Sun / Ascending / Next Ingress / Next Eclipse. Eclipse data isn't available from the approx-engine or backend today. Substituted Moon (phase + degree) because it's already prominent in the design's meta line and all four slots remain derivable from live chart data.
- **Next Ingress computed from approx speeds.** Instead of hardcoding or mocking, it picks the inner/social planet with the smallest `(30 - degInSign) / speed_longitude` and displays the glyph + target sign + days-until. Scoped to Mercury–Saturn since the outers change signs too rarely to be interesting as a "soon" countdown.
- **Kept existing cards (MoonCard, PlanetaryHours, RetrogradeTracker, PlanetCard, AspectGrid, ElementModalityCard, AspectsTimeline) unchanged.** The design specced fresh variants of each, but our production cards already carry real data, dignity logic, collapsibles, skeletons, and tests. Rewriting them for marginal visual polish would be a regression risk. The new layout slots them in as-is; visual polish can be a follow-up per-card.
- **AspectsTimelineShadcn comparison block removed from home.tsx.** The file remains untracked (it was a WIP visual comparison of two timeline variants); only the import and render were dropped from the home route since the editorial design shows a single timeline.
- **Font: Instrument Serif (design) layered over Cormorant Garamond fallback.** Both fonts load; existing copy already rendered with Cormorant keeps a close visual fallback during the Instrument Serif fetch and on browsers that can't reach Google Fonts.
- **Ascendant derived client-side from `chart.houses.ascendant` (longitude).** No backend changes; a small `longitudeToZp` helper converts the longitude into `{ sign, degree, minute }`. Seconds are dropped (not displayed at hero-stat size).
- **Typecheck passes. Tests: 2 pre-existing failures in `format.test.ts` (SIGN_GLYPHS variation-selector mismatch) are not introduced by this change — confirmed by stashing and re-running.** Manual QA via Playwright at 1440×900 confirmed layout matches design (screenshots retained in the task output).

## 2026-04-15 — shadcn migration PR 5: interactive primitives + close-out

### Change
Replaced the last hand-rolled interactive bits inside cards with shadcn primitives. Migration is COMPLETE — all 5 PRs landed. Net effect across PRs 1-5: 13 shadcn primitives installed; 4 ad-hoc styling constants removed; 6 manual outside-click/keyboard handlers removed; ~600 lines of custom interaction code replaced with primitive calls.

### Files Modified (this PR)
- `apps/web/src/components/home/planet-card.tsx` — DignityBadge `<span>` → `Badge`; expand/collapse ternary → single template + `Collapsible` wrapping the dignity-detail addendum
- `apps/web/src/components/home/planetary-hours.tsx` — custom progress `<div>` → `Progress`; expand/collapse ternary → single template + `Collapsible` wrapping the day/night hour list
- `apps/web/src/components/chart/chart-card.tsx` — delete `Dialog` → `AlertDialog`; `⋯` button + manual conditional dropdown → `DropdownMenu`. Rename `Dialog` left as `Dialog` (form, not confirmation).
- `apps/web/src/components/ui/collapsible.tsx` — added height transition animation via `--collapsible-panel-height` CSS var (snapped instantly before)

### Decisions Made (this PR)
- **planet-card Option A** (per user choice) — always render the 5-column position table with dignity badges visible in compact view. Lost the "Positions & Dignities" h3 heading and "click to collapse" hint. Gained badge visibility in compact view (intentional UX shift).
- **Collapsible primitive needed an animation fix** — base-ui's `Collapsible.Panel` exposes `--collapsible-panel-height` but ships no styles. Added `overflow-hidden transition-[height] duration-200 ease-out h-(--collapsible-panel-height) data-[state=closed]:h-0` to the wrapper. Benefits both planet-card and planetary-hours.
- **Rename Dialog stays as `Dialog`** — it's a form (input + buttons), not a confirmation. `AlertDialog` is for confirmations.
- **`AlertDialogCancel` and `AlertDialogAction` bring shadcn defaults** — Cancel is `variant="outline"` (was bare text); Action wraps Button with destructive className override. Slight style drift vs. the old flat buttons; aligns with shadcn conventions.
- **`AlertDialogFooter` has `-mx-4 -mb-4 bg-muted/50 border-t` baked in** — produces a subtle footer band vs. the old flat layout. Visual delta worth eyeballing.
- **A11y follow-ups deferred** — DropdownMenuItem currently uses `onClick`; `onSelect` would handle keyboard activation more cleanly. planet-card's Card-as-trigger pattern lacks `aria-expanded` since we don't use `CollapsibleTrigger`. Pre-migration code had the same gaps; not regressions, but worth a future a11y pass.
- **Manual QA recommended:**
  - Click delete confirmation dialog → confirm AlertDialog Cancel/Delete behave correctly; visual footer drift acceptable
  - Open chart-card `⋯` menu via keyboard (Tab to button, Enter); use Arrow keys + Enter to activate Rename/Delete; verify menu closes
  - Expand/collapse planet-card and planetary-hours; verify smooth height animation (newly added)

## 2026-04-15 — shadcn migration PR 4: card wrappers

### Change
Wrapped six home/chart cards with shadcn `Card` + `CardContent`. Replaced two inner `border-t` dividers with `Separator`. Internals (tables, SVG ring, dignity grids, chart-card's `⋯` menu and dialogs) deliberately untouched — those are PR 5 territory. PR 4 of 5.

### Files Modified
- `apps/web/src/components/home/moon-card.tsx`
- `apps/web/src/components/home/planet-card.tsx` — also Separator for inner divider
- `apps/web/src/components/home/retrograde-tracker.tsx`
- `apps/web/src/components/home/element-modality-card.tsx`
- `apps/web/src/components/home/planetary-hours.tsx` — two Cards (no-result branch + main), Separator for day/night divider
- `apps/web/src/components/chart/chart-card.tsx` — outer wrap only

### Decisions Made
- **`py-0` on every Card wrapper** — shadcn `Card` ships with `py-4` baked in; combined with `CardContent`'s `p-phi-N` this produced double vertical padding. `py-0` neutralizes Card's default so `CardContent` controls vertical padding alone.
- **~~`px-0` on every CardContent~~ (REVERTED)** — Initial fix added `px-0 p-phi-N` to make padding deterministic, but Tailwind v4 sorts utilities alphabetically: `px-0` sorts AFTER `p-phi-N` and won the cascade for `padding-left/right`, zeroing horizontal padding. Reverted to plain `p-phi-N`. The `--spacing-phi-N` chain registers `p-phi-N` as a real Tailwind v4 utility, so `twMerge` correctly dedupes it against shadcn's baked-in `px-4`. No `px-0` needed.
- **chart-card hover uses `ring`, not `border`** — shadcn `Card` uses `ring-1 ring-foreground/10` (no border), so `hover:border-primary/40` did nothing visible. Changed to `hover:ring-primary/40`.
- **Visual deltas accepted per spec (worth eyeballing on your end):**
  - Cards now have `rounded-xl` instead of `rounded-lg` (slightly larger corner radius)
  - Cards now have `ring-1 ring-foreground/10` instead of `border border-border` (semitransparent ring vs solid border — usually visually similar in dark mode)
  - Card has `overflow-hidden` baked in. May clip transforms or shadows that previously bled outside the card rect (e.g. `card-hover` glow effects). Visual check recommended for moon-card and chart-card.
- **Indentation drift** — when a new wrapping JSX level was introduced, inner content was NOT re-indented (preserves git diff focus + avoids accidentally touching internals). Cosmetic readability hit; can be fixed in a future formatter pass.

## 2026-04-15 — shadcn migration PR 3: layout surface

### Change
Migrated the sidebar's user menu and avatar to shadcn primitives. Net ~33-line reduction (deleted UserMenu was 77 lines + 23 lines of state/conditional/refs; replacement is ~67 lines). Removed two hand-rolled effects (mousedown outside-click, escape keydown) and a ref. PR 3 of 5 in the shadcn/ui migration.

### Files Modified
- `apps/web/src/components/layout/sidebar.tsx` — Deleted inline `UserMenu({ onClose })` function and `menuOpen` state. Replaced user trigger button with `DropdownMenu` (using base-ui's `nativeButton={false}` + `render={<button>}` pattern). Replaced custom user-circle div with `Avatar` + `AvatarFallback`. Hoisted `useAstroClient` and `clearAuth` into `Sidebar` from the deleted `UserMenu` scope.

### Decisions Made
- **`useEffect` retained, `useState`/`useRef` removed** — Cmd+B keyboard shortcut handler still uses `useEffect`. The deleted `UserMenu` was the sole consumer of `useRef` and `useState` (for `menuOpen`).
- **Sign-out async ordering kept as-is** — `onClick={async () => { await client.logout(); clearAuth(); toast.success(...); navigate("/login"); }}` returns a promise that base-ui's `DropdownMenuItem` doesn't await. Pre-migration `UserMenu` had the same pattern. Worth a future follow-up to fire `clearAuth`/`toast`/`navigate` synchronously and let logout race in the background — flagged in code review but not changed here.
- **`Avatar` redundant `shrink-0`** — shadcn `Avatar` root already includes `shrink-0`. Kept the explicit class for clarity; harmless duplication.
- **a11y follow-ups noted** — `aria-label={displayName}` on `Avatar` when `collapsed` would help screen readers. Not introduced by this PR but logged for future.
- **Manual QA recommended** — verify (1) sign-out flow under throttled network, (2) sidebar's `onDoubleClick={toggle}` doesn't fire spuriously when double-clicking the trigger button.

## 2026-04-15 — shadcn migration PR 2: forms surface

### Change
Migrated all three forms-package components to shadcn primitives. Removed three ad-hoc styling constants (`selectClass`, `labelClass`, `inputClass`) and the manual outside-click handler in location-search. PR 2 of 5 in the shadcn/ui migration.

### Files Modified
- `apps/web/src/components/forms/birth-data-form.tsx` — 4 native `<select>` → `Select`; 7 `<label className={labelClass}>` → `Label`; name `<input>` → `Input`; styled `errors.submit` `<p>` → `Alert variant="destructive"`. Removed `selectClass` and `labelClass` constants.
- `apps/web/src/components/forms/date-time-picker.tsx` — both `<input>` → `Input`. Auto-slash and auto-colon insertion handlers preserved verbatim. Removed `inputClass` constant.
- `apps/web/src/components/forms/location-search.tsx` — search `<input>` → `Input`; conditional `<ul>` → `Popover`/`PopoverTrigger`/`PopoverContent`. Removed `containerRef` and `mousedown` outside-click `useEffect`. Aligned z-10 on search icon and loading spinner.

### Decisions Made
- **base-ui's `Select` `onValueChange` emits `null` on clear** — strict typecheck requires guarding with `if (v) setX(v as T)`. Since none of the four selects expose a clear action, the guard never triggers in practice but is required for type safety.
- **Non-name labels intentionally lack `htmlFor`** — `DateTimePicker`, `LocationSearch`, and `Select`'s `SelectTrigger` don't expose a stable single id. Adding a wrong `htmlFor` would be worse than none. Future task could add ids to these child components.
- **Visual delta from shadcn defaults is expected** — `Input` ships with `rounded-md`, transparent bg, and focus ring (vs the legacy `bg-input rounded-lg` with focus border-color). Aligns with the spec's choice to keep shadcn defaults rather than mapping tokens.
- **Alert visual delta** — shadcn's `destructive` Alert renders with a left border and different padding than the old pill (`bg-destructive/10 border rounded-lg px-3 py-2`). Acceptable per spec; more consistent with the rest of shadcn.
- **base-ui Popover differs from Radix** — no `PopoverAnchor`; uses `render={<div>...</div>}` slot pattern; needs `nativeButton={false}` for non-button triggers; uses `initialFocus={false}` instead of Radix's `onOpenAutoFocus` to keep typing focus on the Input. `--anchor-width` CSS var matches content to trigger width.
- **a11y/keyboard-nav follow-ups deferred** — location-search popover lacks combobox ARIA roles and ArrowDown/Enter handling. The pre-migration code lacked these too; adding them is out of scope for this refactor and tracked separately.

## 2026-04-15 — shadcn migration PR 1: foundation install

### Change
Verified `@shadcn` registry coverage for the 13 primitives in the migration spec, then installed all of them into `apps/web/src/components/ui/`. No application code touched. PR 1 of 5 in the shadcn/ui migration (see `docs/superpowers/specs/2026-04-15-shadcn-migration-design.md`).

### Files Created
- `apps/web/src/components/ui/card.tsx` — smoke-tested first to confirm `base-nova` style resolves cleanly
- `apps/web/src/components/ui/alert.tsx`
- `apps/web/src/components/ui/alert-dialog.tsx`
- `apps/web/src/components/ui/avatar.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/collapsible.tsx`
- `apps/web/src/components/ui/dropdown-menu.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/popover.tsx`
- `apps/web/src/components/ui/progress.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/separator.tsx`

### Decisions Made
- **No `base-nova` fallbacks needed** — all 13 primitives exist in the `@shadcn` registry under the configured style. No primitive required falling back to the default style.
- **Inline execution for PR 1** — pure CLI installs with no app code changes; subagent dispatch overhead would have outweighed the benefit. Subagents start at PR 2 (forms refactor).
- **Pre-existing baseline build was broken** — fixed in a separate `chore:` commit (null-asserted `planetary-hours.test.ts` Moscow test results, removed unused `COLLISION` import in `planet-ring.ts`). Without this the per-task build gate would have been red regardless.

## 2026-04-08 — PlanetCard: House Column + Expand/Collapse with Dignities (Task 3)

### Change
Added expand/collapse interaction, house number column, and essential dignities display to the PlanetCard component. Compact view now shows house numbers. Expanded view adds dignity badges per planet and a full Dignity Detail grid showing ruler/exaltation/detriment/fall for each planet's current sign.

### Files Modified
- `apps/web/src/components/home/planet-card.tsx` — Added `useState` for expanded toggle, `cursor-pointer` on card, house column in both views, `DignityBadge` component, dignity detail grid with highlighting

### Decisions Made
- **Same expand/collapse pattern as PlanetaryHoursCard** — `useState(false)`, toggle on card click, conditional rendering. Keeps interaction consistent across home page cards.
- **DIGNITY_BODIES excludes Chiron and nodes** — Only the 10 classical+modern planets (Sun through Pluto) have traditional dignity assignments. Chiron and lunar nodes show no dignity badge or detail row.
- **Ruler column shows co-ruler with slash** — For signs with modern co-rulers (Scorpio, Aquarius, Pisces), the Rul column displays `rulerGlyph/coRulerGlyph`. Highlighting triggers if either ruler matches the row's planet.
- **Green for domicile/exaltation, red for detriment/fall** — Matches the existing `text-success`/`text-destructive` color tokens. Badge backgrounds use 30% opacity for subtlety.
- **House from `getHouseForLongitude`** — Uses the dignity module's house calculation with `chartData.houses.cusps`, consistent with the chart renderer's house system.

## 2026-04-08 — Dignity Lookup Module (Tasks 1 & 2)

### Change
Added a pure lookup module for essential astrological dignities (domicile, exaltation, detriment, fall) and house assignment by longitude. Implemented using TDD: failing tests committed first, then full implementation.

### Files Created
- `apps/web/src/lib/dignities.ts` — Full implementation: RULERS, CO_RULERS, EXALTATIONS, DETRIMENTS, FALLS lookup tables plus reverse maps; `getDignityForPlanet`, `getDignityDetail`, `getStrongestDignity`, `getHouseForLongitude` functions
- `apps/web/src/lib/dignities.test.ts` — 50 tests covering all dignity types, priority ordering (domicile > exaltation), peregrine cases, co-ruler handling, and house calculation including wrap-around

### Decisions Made
- **Traditional ruler takes priority in `getDignityDetail`** — `ruler` field always holds the classical planet (e.g. Mars for Scorpio, Saturn for Aquarius); the modern co-ruler is in `coRuler`. This makes the UI layer's job straightforward.
- **No exaltation/fall for outer planets** — Uranus, Neptune, Pluto have domicile and detriment entries only. Classical tradition defines exaltations only for the seven traditional planets; assigning outers would introduce contested modern attributions.
- **`getStrongestDignity` is an alias for `getDignityForPlanet`** — Priority (domicile > exaltation > detriment > fall) is already baked into the lookup order, so a separate ranking function would be redundant.
- **`SIGN_DETRIMENT` uses first-entry-wins** — Some signs have two planets in detriment (e.g. Gemini: Jupiter, Scorpio: Venus/Mars). The reverse map takes the first one; consumers needing all planets should use `DETRIMENTS` directly.
- **House wrap-around handled with circular comparison** — `getHouseForLongitude` checks if `nextCusp < cusp` to detect houses spanning 0°, avoiding the modular arithmetic pitfall.

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

## 2026-04-08 — Fix planet label wrap-around collision near AS axis

### Change
Fixed a bug where planet labels near the Ascendant (AS) were not pushed away by the collision avoidance system. The issue: `longitudeToAngle` maps angles to [π, 3π), so a planet with longitude just below the ascendant wraps to ~3π. The blocker checks used simple `Math.abs(a - b)` which gave ~2π instead of the true circular distance ~0. Added a `circularDiff` helper and applied it in both thin and wide blocker repulsion loops.

### Files Modified
- `packages/chart-renderer/src/core/layout.ts` — added `circularDiff()` helper; updated thin blocker and wide blocker loops to use circular distance
- `packages/chart-renderer/src/core/layout.test.ts` — added wrap-around test case for planet near 3π being pushed from AS blocker at π

### Decisions Made
- **`circularDiff` returns signed value in (-π, π]** — preserves push direction semantics (positive = CCW from blocker) while fixing the distance calculation
- **Applied to both thin and wide blockers** — house cusp blockers near AS could have the same wrap-around issue

## 2026-04-08 — Emil Kowalski design engineering polish

### Change
Applied Emil Kowalski's design engineering principles across the UI:
1. **Custom easing curves**: Replaced all generic `ease-out`/`ease` with `cubic-bezier(0.23, 1, 0.32, 1)` — a strong ease-out that makes animations feel intentional
2. **Button press feedback**: Changed `:active` from `translate-y-px` to `scale(0.97)` on all buttons including sidebar nav
3. **Hover media query**: Wrapped `.card-hover:hover` in `@media (hover: hover) and (pointer: fine)` to prevent false positives on touch devices
4. **Explicit transitions**: Replaced all `transition-all` with specific properties (`background-color`, `border-color`, `transform`) in button component, chart cards, and chart list items
5. **Reduced motion**: Added `prefers-reduced-motion: reduce` media query that disables stagger fade-in animations
6. **Tooltip delay**: Changed default from 0ms to 300ms with instant close, preventing accidental tooltip activation on hover

### Files Modified
- `apps/web/src/index.css` — custom easing on `.animate-fade-in` and `.card-hover`, hover media query guard, reduced motion query
- `apps/web/src/components/ui/button.tsx` — `transition-all` → explicit properties, `translate-y-px` → `scale-[0.97]`
- `apps/web/src/components/ui/tooltip.tsx` — default delay 0 → 300ms, added closeDelay=0
- `apps/web/src/components/layout/sidebar.tsx` — explicit transition properties, added `active:scale-[0.97]`
- `apps/web/src/components/home/planet-card.tsx` — `transition-colors` → explicit `transition-[background-color]` with 120ms duration
- `apps/web/src/components/chart/chart-card.tsx` — `transition-all` → explicit properties
- `apps/web/src/routes/charts.tsx` — `transition-all` → explicit properties (2 instances)

### Decisions Made
- **`cubic-bezier(0.23, 1, 0.32, 1)` over built-in `ease-out`** — Emil's recommended strong ease-out curve; starts fast giving instant feedback
- **`scale(0.97)` over `translateY(1px)`** — scale feels more physical and works regardless of element size
- **300ms tooltip delay** — prevents accidental activation while keeping UI responsive; Base UI's `closeDelay=0` ensures instant subsequent tooltips
- **`duration-160` on buttons** — 160ms is the sweet spot for press feedback per Emil's guidelines
- **`duration-120` on table row hover** — faster for high-frequency interactions (scanning planet list)

## 2026-04-08 — Home page design polish: typography, atmosphere, card hierarchy

### Change
Three visual improvements to the home page:
1. **Typography**: Replaced Inter with Cormorant Garamond (display/headings) + DM Sans (body/data). Gives the app an editorial, refined quality.
2. **Background atmosphere**: Added dark-mode-only radial gradients (blue glow top-center, faint purple bottom-right) and a barely-visible noise texture for depth.
3. **Card visual hierarchy**: Chart wheel is now borderless with a subtle primary-color glow (hero). Moon card has a gradient accent border. All cards have hover lift. Sections fade in with stagger on load.

### Files Modified
- `apps/web/index.html` — Google Fonts link updated
- `apps/web/src/index.css` — font variables, atmospheric background, card utilities, animations
- `apps/web/src/routes/home.tsx` — display font on heading, staggered animation delays
- `apps/web/src/components/home/chart-wheel.tsx` — borderless with glow shadow
- `apps/web/src/components/home/moon-card.tsx` — gradient accent border, display font
- `apps/web/src/components/home/planet-card.tsx` — card-hover class
- `apps/web/src/components/home/retrograde-tracker.tsx` — card-hover, display font
- `apps/web/src/components/home/element-modality-card.tsx` — card-hover class
- `apps/web/src/components/home/aspects-timeline.tsx` — card-hover, display font
- `apps/web/src/components/layout/sidebar.tsx` — display font on brand name
- `apps/web/src/components/chart/distribution-overlay.tsx` — DM Sans font reference

### Decisions Made
- **Cormorant Garamond over Playfair Display** — lighter weight, more elegant for an astrology app; Playfair is too heavy/editorial
- **DM Sans over Outfit** — closer to Inter in metrics so less layout disruption, but more geometric character
- **Noise at 3% opacity** — any higher and it becomes distracting; any lower and it's invisible. 3% adds texture without drawing attention
- **Radial gradients use OKLch** — consistent with existing color system
- **Gradient border via mask-composite** — standard CSS technique, no JS, works in all modern browsers
- **Animation delay 50ms stagger** — fast enough to feel snappy, slow enough to create visual sequence
- **No entry animation on individual cards** — animating columns as groups is more cohesive than per-card stagger which looks "waterfall-y"

## 2026-04-07 — Reduce planet label displacement near angle labels (stellium fix)

### Change
Planets in stelliums were being pushed too far from their true ecliptic positions, especially near angle labels (AS/DS/MC/IC). Two changes:
1. Reduced angle label wide blocker from 4 points (spanning ~27°) to 2 points (spanning ~9°), matching actual label footprint
2. Reduced `maxDisplacement` from 89px to 55px to keep labels closer to true positions

### Files Modified
- `packages/chart-renderer/src/core/constants.ts` — `COLLISION.maxDisplacement` 89 → 55
- `packages/chart-renderer/src/layers/planet-ring.ts` — angle blocker loop from `step -1..2` (4 points) to `step 0..1` (2 points)
- `packages/chart-renderer/src/core/layout.test.ts` — updated maxDisplacement test to match new 55px value

### Decisions Made
- **2 blocker points, not 3** — the actual angle label ("Ic 02♓28") is ~40-50px of arc; 2 points at 36px spacing covers this without claiming excessive space
- **55px max displacement** — ~14° max drift at typical radius, down from ~23°; keeps labels readable while still allowing enough room for moderate clusters
- **`minGlyphGap` unchanged at 34px** — spacing between labels is fine; the problem was blocker size and max drift, not inter-label gap

## 2026-04-07 — Responsive font sizing for Aspect Grid and Element-Modality Card

### Change
Made text in the aspect grid and element-modality card scale with screen/container size using CSS container queries (`cqi` units), matching the chart wheel's responsive behavior. Previously, text was either em-relative to a non-scaling parent (aspect grid) or fixed Tailwind sizes (element-modality card), making it too small on large screens and not responsive.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — added `containerType: "inline-size"` to wrapper, set grid `fontSize` to `${100/N}cqi` so existing em-relative sizes scale with container width
- `apps/web/src/components/home/element-modality-card.tsx` — added `containerType: "inline-size"` to wrapper, set table `fontSize: "3.5cqi"`, removed fixed `text-xs`/`text-sm` Tailwind classes in favor of inherited container-relative size

### Decisions Made
- **`cqi` units over viewport units** — consistent with existing pattern in `distribution-overlay.tsx`; scales with container not viewport, so layout changes (sidebar open/close) are handled correctly
- **Aspect grid: `100/N cqi`** — divides container width by number of columns so `1em` ≈ cell width; existing em-relative sizes (0.45em–0.75em) then fill cells proportionally
- **Element-modality card: `3.5cqi`** — chosen to give readable text at typical right-column width (38.2% of viewport)

## 2026-04-07 — Aspect Grid: Show orb degrees, A/S indicator, and minutes

### Change
Added degree value, applying/separating indicator (A/S), and minute value below the aspect glyph in each aspect grid cell. Format: `0S38` means 0° separating, 38'. For planet–planet aspects, `is_applying` comes from the backend. For angle–planet aspects, applying/separating is calculated client-side from the planet's `speed_longitude`.

### Files Modified
- `apps/web/src/components/home/aspect-grid.tsx` — added `isApplying` to `AspectEntry`, updated `detectAspect` to compute applying/separating from speeds, added orb text display below glyph

### Decisions Made
- **Angle speed is 0** — angles (ASC, MC, etc.) are treated as stationary for applying/separating calculation since this is a natal chart
- **Angle–angle aspects default to separating** — since both speeds are 0, `isApplying` defaults to false

## 2026-04-07 — Fix: Geolocation grant doesn't update chart data

### Change
Added a location-watching effect to `useCurrentSky` so that when the browser geolocation resolves (after the user grants permission), precise chart data is re-fetched with the real coordinates. Previously, the precise fetch only ran once on mount with the default London coordinates, and the in-flight response would overwrite any geolocation-updated data.

### Files Modified
- `apps/web/src/hooks/use-current-sky.ts` — added effect that watches `location` and calls `fetchPrecise` when it changes

### Decisions Made
- **Ref-based skip for initial mount** — `prevLocationRef` ensures the effect doesn't double-fetch on mount (the existing `preciseFetchedRef` effect handles that)

## 2026-04-06 — Custom SVG Path Glyphs (cross-browser glyph rendering)

### Change
Replaced all Unicode astrological symbol rendering with custom SVG path data rendered via Canvas `Path2D` API. This eliminates cross-browser rendering differences caused by font fallback, `measureText()` variance, and `textBaseline` inconsistencies between Firefox and Chrome.

### Files Added
- `packages/chart-renderer/src/glyphs/draw.ts` — `drawPathGlyph()` function using Path2D
- `packages/chart-renderer/src/glyphs/planet-paths.ts` — 17 planet SVG paths + width ratios
- `packages/chart-renderer/src/glyphs/sign-paths.ts` — 12 zodiac sign SVG paths + width ratios
- `packages/chart-renderer/src/glyphs/aspect-paths.ts` — 11 aspect SVG paths + width ratios

### Files Modified
- `zodiac-ring.ts`, `planet-ring.ts`, `house-overlay.ts`, `aspect-web.ts` — migrated to path rendering
- `adapters/svg.ts` — SVG `<text>` elements replaced with `<path>` elements
- `charts/biwheel.ts` — migrated transit planet glyphs to path rendering
- `glyphs/index.ts` — updated re-exports
- `glyphs/glyphs.test.ts` — tests for key coverage, width bounds, path validity

### Files Deleted
- `packages/chart-renderer/src/glyphs/planets.ts` — old Unicode planet glyphs
- `packages/chart-renderer/src/glyphs/signs.ts` — old Unicode sign glyphs

### Decisions Made
- **Calligraphic style** chosen for glyph design (variable stroke width, traditional manuscript feel)
- **100×100 design grid** for SVG paths — scales to any pixel size
- **Fill-only rendering** — all paths are closed shapes (lines converted to thin rectangles/polygons)
- **Width ratios** per glyph for deterministic layout (replaces `measureText()` for glyph tokens)
- **Degree numbers, house numbers, axis labels, retrograde ℞ stay as `fillText()`** — these are standard characters that render consistently across browsers

---

## 2026-04-06 — Open-Path Glyph Fixes (fill-only rendering)

### Change
Converted all remaining open SVG sub-paths in glyph files to closed filled shapes. The renderer uses `ctx.fill()` only — any path without `Z` close has zero fill area and is invisible.

### Files Modified
- `packages/chart-renderer/src/glyphs/sign-paths.ts` — fixed taurus horns, cancer (2 spirals), leo (3 segments), virgo (3 strokes), libra (bar + arch + bottom curve), scorpio (3 strokes + arrow), capricorn (looping stroke), pisces (2 parentheses + bar)
- `packages/chart-renderer/src/glyphs/planet-paths.ts` — fixed NORTH_NODE and SOUTH_NODE corner bracket L-shapes and stems
- `packages/chart-renderer/src/glyphs/aspect-paths.ts` — fixed conjunction stem, opposition connector, semi_sextile stem and bar

### Decisions Made
- **Straight lines → 4px-wide rectangles:** `M x1 y1 L x2 y2` converted to 4-unit-wide closed rect
- **Open curves → closed ribbons:** Offset control points ~3 units and close to form a thin filled band
- **L-shaped brackets → closed L-polygons:** Corner bracket M/L chains converted to closed 4px-wide L-shapes
- **Scorpio arrow barbs** converted to a single closed polygon tracing both barb lines and returning through the main stroke

---

## 2026-04-06 — Review Findings Bug Fixes (review_findings-1.md)

### Change
Fixed 5 of 6 findings from code review. Finding 6 (auth tokens in localStorage) deferred — requires backend cookie auth support.

### Bugs Fixed
- **Finding 1 (High):** Cloud chart detail navigation now works. `chart-view.tsx` reads `?source=cloud` search param and fetches via `client.getCloudChart(id)`, converting `CloudChart` to `StoredChart` for rendering. Shows cloud-specific error on fetch failure.
- **Finding 2 (High):** Precise API aspects no longer overwritten with approximate aspects. Exported `calculateAspects()` from `approx-engine` and used it to recalculate aspects from the precise positions returned by the API, instead of discarding them via `calculateApproximate()`.
- **Finding 3 (Medium):** Sidereal chart edits now preserve `ayanamsa`. Added ayanamsa state to the edit dialog, synced from stored request, conditionally shown when zodiac type is sidereal, and included in the recalculation request.
- **Finding 4 (Medium):** Fixed stale `aspectMap` memoization in `aspect-grid.tsx` — added `gridBodies` to the dependency array so node type changes correctly update angle-to-node aspects.
- **Finding 5 (Medium):** Added `typecheck` script to `apps/web/package.json`. Fixed `use-settings.test.ts` to include `nodeType` and `timeFormat` in state setup. Removed unused `defaults` binding in `transits.tsx`.

### Deferred
- **Finding 6 (Medium):** Auth token storage hardening. Requires backend support for httpOnly cookie-based refresh tokens before the frontend can migrate.

### Decisions Made
- **`calculateAspects` exported:** Made the previously-internal `calculateAspects()` function a public export from `@astro-app/approx-engine`. This enables recalculating aspects from any set of positions (e.g., precise API positions) with user orb settings, without re-running the full approximate calculation.
- **Cloud chart conversion:** `CloudChart` is converted to `StoredChart` in-memory for rendering. Cloud charts are not automatically cached to IndexedDB — the user can explicitly save them.

## 2026-04-06 — Chart Renderer Bug Fixes (BUG_REPORT.md)

### Change
Fixed 6 bugs from BUG_REPORT.md, triaged remaining 5 as not-bugs or deferred features.

### Bugs Fixed
- **BUG-001:** Replaced all hardcoded `serif` font references (8 files) with `theme.fontFamily`. Added `fontFamily` default parameter to `drawGlyph()` and `drawSignGlyph()` for backward compatibility.
- **BUG-003:** Deleted empty `degree-labels.ts` stub and removed non-functional `degreeLabels` layer toggle from `RenderOptions`.
- **BUG-008:** Removed unused `SIGN_ABBREVIATIONS` constant and deleted `aspects.ts` (`ASPECT_SYMBOLS` was never imported).
- **BUG-009:** Added circular wrap-around check in `resolveCollisions()` so planets near 0°/360° boundary are collision-resolved.
- **BUG-010:** Changed `background.ts` to use CSS dimensions (`canvas.width / dpr`) instead of physical pixel dimensions for `fillRect`.
- **BUG-011:** Aligned light theme aspect colors with dark theme's design system palette. Minor aspects now use `text-secondary (#8892A4)`.

### Triaged as Not Bugs
- **BUG-004, BUG-005, BUG-006:** CHART_RENDERING_SPEC.md was already updated to document the current values. These are intentional design decisions, not regressions.

### Deferred
- **BUG-002:** SVG adapter rewrite — feature-level work, not a bugfix.
- **BUG-007:** Responsive scaling — feature not yet implemented.

### Decisions Made
- **Spec updated:** CHART_RENDERING_SPEC.md `ASPECT_CIRCLE_RATIO` corrected from `0.40` to `0.455` to match the φ-based value in code.
- **Light theme aspect color strategy:** Derive from same element-color mapping as dark theme, with slightly darkened values for white background contrast. Minor aspects use `text-secondary` instead of ad-hoc grays.

## 2026-04-03 — Settings: Save/Cancel Instead of Immediate Apply

### Change
Settings page no longer applies changes immediately. All edits are held in local React state (draft). Save and Cancel buttons appear when there are unsaved changes. Settings are only persisted to Zustand/localStorage when Save is pressed.

### Decisions Made

**Draft state pattern:** Local `useState` holds a copy of settings. All form controls read/write the draft. On Save, draft values are committed to the Zustand store. On Cancel, draft is reset to current store values. This avoids any intermediate state leaking to other parts of the app.

**Conditional button visibility:** Save/Cancel buttons only appear when the draft differs from the persisted settings (`isDirty` flag). Reset to defaults still works immediately (resets both store and draft).

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
