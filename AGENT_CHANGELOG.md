# Agent Changelog

## 2026-04-19 — Adaptive foundation: chart-renderer density input

### Change
Plumbed a `ChartDensity` input (stroke multiplier, glyph scale, label
font size in px) through the chart renderer so every hard-coded pixel
constant in the layers scales with the per-breakpoint `--chart-*` CSS
vars defined in `apps/web/src/index.css`. `RenderOptions` accepts an
optional `density?: Partial<ChartDensity>`; `RenderDimensions` now
carries a resolved `ChartDensity` (defaults merged upstream), so layer
functions can rely on `dim.density` without null checks. The web
`ChartCanvas` reads the vars off its container via `getComputedStyle`
inside the existing ResizeObserver render tick and also re-runs the
effect on tier transitions via `useBreakpoint()`.

### Files
- `packages/chart-renderer/src/layers/types.ts` — added `ChartDensity`
  interface, `DEFAULT_CHART_DENSITY` constant, and a required
  `density: ChartDensity` field on `RenderDimensions`. Already re-exported
  through the package index via `export * from "./layers/types.js"`.
- `packages/chart-renderer/src/core/renderer.ts` — extended
  `RenderOptions` with `density?: Partial<ChartDensity>`; added a
  `resolveDensity()` helper; merges into `innerDim`/`outerDim` in both
  `renderRadix` and `renderBiwheel`; scales the biwheel separator ring
  stroke by `density.stroke`.
- `packages/chart-renderer/src/layers/zodiac-ring.ts` — modulated 6
  pixel-constant sites: sign divider stroke, zodiac outer/inner ring
  strokes, degree tick widths (3 tiers), sign glyph size, and the
  `6/4/2 * ts` tick lengths (glyphScale).
- `packages/chart-renderer/src/layers/house-overlay.ts` — modulated 5
  sites: house-number ring stroke, angular house cusp stroke, non-angular
  cusp stroke, cusp divider tick stroke, house-number font size
  (glyphScale). Cusp label numeric font now uses `density.labelSize`
  directly; embedded sign glyphs inside the cusp label use glyphScale.
- `packages/chart-renderer/src/layers/aspect-web.ts` — modulated 3 sites:
  aspect line width (major + minor), aspect glyph size, outer aspect
  circle stroke.
- `packages/chart-renderer/src/layers/planet-ring.ts` — modulated planet
  glyph size, sign glyph size, degree-label font (now `labelSize`), tick
  width + length, and the subpixel leader-line stroke. Planet tokens
  now carry explicit sizes so glyphs scale with glyphScale while numeric
  labels track labelSize.
- `packages/chart-renderer/src/layers/chart-info.ts` — info-panel font
  scales by `labelSize / 12` on top of the existing radius-derived base,
  so small screens get a tighter label while very large wheels still
  read proportionally.
- `packages/chart-renderer/src/layers/background.ts` — verified, no
  changes (layer has no pixel constants, only `clearRect` + `fillRect`).
- `packages/chart-renderer/src/charts/biwheel.ts` — modulated transit
  glyph size, transit tick width + length, transit leader-line stroke,
  and inter-chart aspect line width.
- `apps/web/src/components/chart/chart-canvas.tsx` — added
  `readChartDensity()` helper that parses the three `--chart-*` vars off
  the container's computed style (with sane finite/positive fallbacks);
  reads density inside the `render()` tick; depends on `useBreakpoint()`
  tier so density changes that don't trigger a resize still re-render;
  imports the newly exported `ChartDensity` type from the package index.

### Decisions
- **`density` required on `RenderDimensions`, optional on
  `RenderOptions`.** Upstream merge-with-defaults means layer functions
  never see `undefined`, eliminating per-site null checks. Callers that
  don't pass `density` — every existing non-web consumer (SVG adapter,
  demo/visual harnesses, `export-charts.ts` PNG rendering) — get
  identical output to pre-change because each key defaults to the
  previous hard-coded value (`stroke: 1`, `glyphScale: 1`,
  `labelSize: 12`). Verified: 48-test chart-renderer suite passes with
  zero edits needed.
- **`labelSize` is an absolute pixel value, not a multiplier.** The plan
  explicitly calls out that label sizes should be settable in px so the
  tier token (`10px` phone → `13px` wide) lands directly as the font
  size, independent of wheel radius. `chart-info.ts`'s radius-derived
  base is multiplied by `labelSize / 12` to preserve its proportional-
  to-radius behavior while still shifting with the tier.
- **Tick lengths scale by glyphScale, not stroke.** A tick is a visual
  mark whose *apparent size* should grow with the tier, while the stroke
  axis controls its *line weight*. The pair of axes gives independent
  control: a dense phone tier can have thinner (`stroke: 1.5×`) but
  proportionally-short (`glyphScale: 0.85×`) ticks; wide tier gets both
  bumped.
- **Subpixel `0.5`-width strokes stay below the multiplier.** The planet
  leader line, zodiac minor-tick, and biwheel transit leader all use
  `0.5` as an intentional sub-pixel hairline. Multiplying by
  `density.stroke` keeps them proportionally thin at each tier (`0.75`,
  `0.875`, `1.0`, `1.0`). Not rounded up — that would defeat the
  hairline-hint intent on non-2× displays.
- **`+1` legibility bump on transit glyphs preserved.** `biwheel.ts`
  applies a `+1` to `glyphSizes(radius).degreeLabel` before multiplying
  by `glyphScale` so the existing transit-over-natal visual hierarchy
  (transit glyphs intentionally a touch larger than inner natal degrees)
  is preserved at every tier rather than smeared by the scalar.
- **Re-render trigger via `useBreakpoint().tier`.** ResizeObserver
  usually fires at layout-breakpoint transitions because the container
  width changes — but a user-preference density toggle (future work) or
  sidebar-collapse at the same tier won't trigger a resize. Adding
  `tier` to the effect dependency array is cheap (only one re-render
  per tier change, not per pixel) and makes density refreshes
  deterministic.
- **`mini-wheel.tsx` and the SVG adapter intentionally untouched.** They
  own their own drawing code and the plan scopes this task to the
  canvas renderer. Both can adopt density in a follow-up; their current
  hard-coded values continue to match `DEFAULT_CHART_DENSITY`, so the
  visual output is unchanged.

### Verification
- `npm test --workspace=packages/chart-renderer` — 48/48 passing
  (geometry, layout, glyphs, svg adapter). No test changes needed; the
  opt-in `density` argument means default-path renders are byte-
  equivalent (same numeric constants).
- `npm run typecheck --workspaces` — all 5 packages clean
  (shared-types, chart-renderer, astro-client, approx-engine, web).
- `npm run build --workspace=apps/web` — succeeds, 605 ms. The
  `ChartCanvas` picks up the new `density` prop through TypeScript's
  structural typing; no runtime ReferenceErrors.
- Manual resize smoke — flagged as requiring a running dev server to
  observe the stroke/glyph/label shift at 640 / 1024 / 1440 px. Not
  executed in this session; the three CSS variables are already set
  per-tier in `index.css` (phone `1.5 / 0.85 / 10`, tablet
  `1.75 / 0.92 / 11`, desktop `2 / 1 / 12`, wide `2 / 1.05 / 13`) and
  the typecheck + unit-test path confirms the plumbing is sound.

## 2026-04-19 — Adaptive foundation: useBreakpoint hook

### Change
Added `useBreakpoint()` hook returning the current semantic tier (`phone` /
`tablet` / `desktop` / `wide`) plus convenience booleans (`isPhone`,
`isTabletOrSmaller`, `isDesktopOrLarger`, `isWide`). Intended for the JS
branches that the CSS token system alone can't express — primarily
layout-pattern switching on chart-view (tabs vs multi-column) in the
upcoming Phase 3 hard-pages work.

### Files
- `apps/web/src/hooks/use-breakpoint.ts` — new hook (~110 LOC incl.
  JSDoc). Uses `useSyncExternalStore` with three `matchMedia` queries
  (`(min-width: 640px)`, `(min-width: 1024px)`, `(min-width: 1440px)`).
  Subscribes/unsubscribes listeners on mount/unmount, caches the computed
  state between calls so `getSnapshot` returns a stable reference
  (required for `useSyncExternalStore` to avoid infinite loops), and
  falls back to `'desktop'` when `window` is undefined.

### Decisions
- **Chose `useSyncExternalStore` over `useState + useEffect`.** The
  existing hooks (`use-settings`, `use-sidebar`) use Zustand, not raw
  `useEffect`, so there was no "matching pattern" to mimic. React 18's
  `useSyncExternalStore` is the idiomatic primitive for external-source
  state like `matchMedia`; it handles the concurrent-rendering tearing
  problem that naive `useState` + `addEventListener` cannot. Lower ceremony,
  fewer sharp edges.
- **Memoized the snapshot by tier, not by identity.** `useSyncExternalStore`
  requires `getSnapshot` to return referentially-stable objects between
  calls when the underlying state hasn't changed — otherwise every render
  schedules another render. Cached the last-computed `BreakpointState` at
  module scope, keyed on the derived tier; recomputed only when the tier
  flips. This also keeps all subscribers sharing one cached object.
- **Default to `'desktop'` for SSR.** Mirrors the implicit "desktop-shaped
  state on first paint" assumption of `use-settings.ts` / `use-sidebar.ts`
  (both `persist`-wrapped Zustand stores that hydrate post-mount). The app
  is client-only (Vite SPA, no SSR), so `getServerSnapshot` only runs if
  someone later introduces SSR/pre-render; the default keeps the layout
  sensible until `window` becomes available.
- **No barrel export.** `hooks/` has no `index.ts`; consumers import
  hooks directly. Kept the convention.
- **No tests.** The plan explicitly calls this out as "manual smoke" —
  the hook is thin, and its value is in integration with layouts that
  don't yet exist. A test for tier derivation would assert on internal
  structure without catching the real failure mode (listener leaks,
  SSR mismatch on the two existing consumers).

### Verification
- `npm run typecheck --workspaces` passes (all four packages).
- `npm run build --workspace=apps/web` passes (1.66 s).
- No React runtime warnings expected: `useSyncExternalStore` is the
  officially-supported path for `matchMedia` in React 18+. The cached
  snapshot prevents the "getSnapshot should be cached" warning.

## 2026-04-19 — Adaptive foundation: density token system

### Change
Extended the existing three density vars (`--gap` / `--pad` / `--pad-sm`) into
a full 19-token inventory — spacing (`--pad-xs/sm/lg`, `--gap-xs/sm/lg`),
typography (`--text-xs/sm/base/lg/xl/2xl`), chart geometry (`--chart-stroke`,
`--chart-glyph-scale`, `--chart-label-size`), and cards (`--card-radius`,
`--card-pad`). Phone values form the compact baseline on `:root`; three
`@media (min-width: 640/1024/1440px)` blocks override `:root` to loosen at
tablet/desktop/wide. Registered the new spacing tokens in `@theme inline` as
`--spacing-*` so Tailwind generates utilities like `p-pad-lg`, `gap-gap-xs`,
`p-card-pad`. The existing `[data-density="compact"|"spacious"]` user-
preference overrides are preserved and placed AFTER the `@media` blocks so
they still win on source-order ties (all three selector forms — `:root`,
`:root` inside `@media`, and `[data-density="…"]` — have identical
specificity `(0,1,0)`).

### Files
- `apps/web/src/index.css` —
  - Replaced the 4-line `--space/--gap/--pad/--pad-sm` baseline block in
    `:root` with the full 19-token phone-baseline inventory.
  - Added three `@media (min-width: …)` blocks on `:root` for
    tablet/desktop/wide tier overrides, placed between the `.dark`-block /
    `@theme inline` pair and the `[data-density]` overrides.
  - Added `--spacing-*` registrations in `@theme inline` for every new
    spacing/gap/card-pad token so Tailwind auto-generates classes.
  - Added a commented placeholder explaining that `--text-*` tokens are
    intended for arbitrary-value usage (`text-[var(--text-base)]`) rather
    than registered as Tailwind `text-*` utilities — registering them would
    conflict with Tailwind's built-in `text-xs`/`text-sm`/etc scale, which
    multiple components in the codebase already depend on (dialogs, inputs,
    planet tables).

### Decisions
- **Preserved today's desktop look exactly.** Desktop-tier values for the
  three pre-existing tokens are unchanged: `--pad: 18px`, `--gap: 16px`,
  `--pad-sm: 12px`. The tier below (tablet: 16/14/10) is tighter, the tier
  above (wide: 22/20/14) is looser. Users on a 1024–1439 px viewport see
  identical spacing to before.
- **Deviated from the plan's illustrative table in two tokens.**
  1. `--gap-lg` — illustrative was 18/22/24/28, which is flatter than the
     other `-lg` tokens. Chose 20/24/28/32 instead so `--gap-lg` parallels
     `--pad-lg` (same values, same intent: the "large spacing" primitive).
     Symmetric + memorable.
  2. `--pad` wide-tier — illustrative said 20, I used 22. A 20→22 step at
     the wide tier keeps the phone-to-wide multiplier roughly constant
     with `--pad-lg` (20→32, 1.6×), matches the 16→20 step on `--gap`, and
     avoids `--pad` compressing relative to `--gap-lg` on wide displays.
  All other tokens track the illustrative table verbatim.
- **Placed `@media` overrides BEFORE `[data-density]` blocks.** Source
  order matters when specificity ties; `[data-density]` must come last so
  a compact/spacious user preference wins at every breakpoint. Verified by
  reading: `:root` and `[data-density="compact"]` both have specificity
  `(0,1,0)` — cascade falls to document order.
- **Did not register `--text-*` tokens in `@theme inline`.** Tailwind's
  built-in `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`,
  `text-2xl` classes are heavily used across the codebase (inputs,
  dialogs, planet tables, settings, charts) and redefining them via
  `--text-*` would silently change every existing usage. `--text-*` vars
  remain consumable via arbitrary-value classes when a component
  explicitly opts in. Registering them is a later, auditable step.
- **Kept `--space: 16px` unchanged.** It's the legacy single value used
  for the design-bundle grid; not part of the new adaptive scale. No
  consumer benefits from making it breakpoint-scoped today.

### Verification
- `npm run build --workspace=apps/web` passes (720 ms).
- `npm run typecheck --workspaces` passes.
- Token values verified monotonic across phone ≤ tablet ≤ desktop ≤ wide
  for every token in the table (manual inspection).
- Desktop-tier values for `--pad` (18), `--gap` (16), `--pad-sm` (12)
  match the pre-existing `:root` values exactly — no visual regression
  for users on 1024–1439 px viewports.

## 2026-04-19 — Adaptive foundation: semantic breakpoints + codebase sweep

### Change
Replaced Tailwind's default `sm`/`md`/`lg`/`xl`/`2xl` screens with a four-tier
semantic breakpoint system — `phone` (0–639, no prefix), `tablet` (≥640),
`desktop` (≥1024), `wide` (≥1440) — declared via `--breakpoint-*` vars in the
`@theme inline` block. Mechanically swept all 21 real Tailwind breakpoint
prefix usages across `apps/web/src/**` to the new names. `sm:` and `md:` both
collapse into `tablet:`, `lg:`/`xl:` into `desktop:`, `2xl:` into `wide:`.
Zero breakpoint prefixes remain in the codebase; all matches now resolve to
intentional semantic names.

### Files
- `apps/web/src/index.css` — added `--breakpoint-tablet: 640px;`,
  `--breakpoint-desktop: 1024px;`, `--breakpoint-wide: 1440px;` inside the
  existing `@theme inline` block.
- `apps/web/src/components/ui/input.tsx` — `md:text-sm` → `tablet:text-sm`.
- `apps/web/src/components/ui/alert.tsx` — `md:text-pretty` → `tablet:text-pretty`.
- `apps/web/src/components/ui/skeleton.tsx` — `md:flex-row` → `tablet:flex-row`.
- `apps/web/src/components/ui/dialog.tsx` — `sm:max-w-sm`, `sm:flex-row`,
  `sm:justify-end` → `tablet:…` equivalents (2 lines).
- `apps/web/src/components/ui/alert-dialog.tsx` — 5 class strings migrated:
  `data-[size=default]:sm:max-w-sm`, three `sm:group-data-[size=default]/…`
  variants in the header, `sm:flex-row sm:justify-end` in the footer, and
  `md:text-pretty` in the description.
- `apps/web/src/components/layout/sidebar.tsx` — `hidden md:flex` → `hidden tablet:flex`.
- `apps/web/src/components/layout/app-layout.tsx` — `md:pb-0` → `tablet:pb-0`.
- `apps/web/src/components/layout/mobile-tabs.tsx` — `md:hidden` → `tablet:hidden`.
- `apps/web/src/routes/home.tsx` — three responsive class strings
  (`md:grid-cols-4`, `md:flex-row`, `md:grid-cols-[1fr_1.6fr_1fr]`) migrated
  to `tablet:`.
- `apps/web/src/routes/charts.tsx` — page padding `md:px-12` → `tablet:px-12`,
  loading grid `sm:grid-cols-2 lg:grid-cols-3` → `tablet:grid-cols-2 desktop:grid-cols-3`.
- `apps/web/src/routes/transits.tsx` — `md:px-12` → `tablet:px-12`,
  `md:flex-row` → `tablet:flex-row`.
- `apps/web/src/routes/settings.tsx` — `md:px-12` → `tablet:px-12`.

### Decisions
- **Kept the existing `@theme inline` block, added the three `--breakpoint-*`
  vars alongside tokens already registered there.** Tailwind 4 reads screen
  definitions directly from `@theme` — the simplest place for them, and
  colocated with `--spacing-*` / `--color-*` entries they conceptually sit
  beside.
- **Collapsed `sm:` + `md:` → `tablet:`.** Old `md:` used 768 px as the
  breakpoint; new `tablet:` is 640 px, so content that previously appeared at
  768 px now appears 128 px earlier. Every affected call site is an
  "appear on tablet+" pattern (`hidden md:flex`, `md:flex-row`,
  `md:grid-cols-4`, `md:text-pretty`, etc.), where appearing at a lower
  threshold is strictly additive — content simply unlocks sooner. No logic
  relied on the exact 768 px boundary.
- **Collapsed `lg:` + `xl:` → `desktop:`.** Only `lg:grid-cols-3` in
  charts.tsx was a real prefix usage; no `xl:` prefix usages existed in the
  sweep, so the map was unambiguous.
- **Did not touch `charts-page.css`.** Confirmed — that file uses raw
  `@media (max-width: …)` queries, not Tailwind prefixes; the plan
  (Phase 2.2) will migrate those queries separately.
- **Did not touch `button.tsx` / `cva` size keys.** The `sm:`/`lg:`
  occurrences in `button.tsx` are CVA variant keys (`size: { sm: …, lg: … }`),
  not breakpoint prefixes.

### Verification
- `grep -rE '\b(sm|md|lg|xl|2xl):[a-z0-9\[\-]' apps/web/src` returns zero
  matches — all Tailwind breakpoint prefixes are migrated.
- `npm run typecheck --workspaces` passes.
- `npm run build --workspace=apps/web` passes.

## 2026-04-19 — Grid chart cards show the aspect web

### Change
On the `/charts` page, the featured hero card's 360 px `MiniWheel` drew the
full aspect web (red/blue lines in the center), while the grid-view chart
cards' 120 px wheels did not — they stopped at sign glyphs, planet glyphs,
and axes. The two contexts rendered the same chart with visibly different
visual languages. Flipped the grid card's `MiniWheel` variant from
`"compact"` to `"featured"` so its 120 px wheel is bumped from Tier M to
Tier L by the existing `variant === "featured" && baseTier === "M"` rule
in `mini-wheel.tsx`, which unlocks aspect rendering, degree ticks, and
axis labels at the smaller size.

### Files
- `apps/web/src/components/chart/chart-card-editorial.tsx` — line 85:
  `toMiniWheelProps(chart.chart, { size: 120, variant: "compact" })` →
  `toMiniWheelProps(chart.chart, { size: 120, variant: "featured" })`.

### Decisions
- **Reused the existing variant bump instead of adding a new prop.**
  `MiniWheel` already has a `variant === "featured"` escape hatch that
  elevates Tier M to Tier L (`mini-wheel.tsx:187-188`). Adding a
  dedicated `showAspects` / `featuredLayers` prop would be strictly more
  surface area for the same visual outcome; the existing mechanism is
  exactly the one intended for this case (the comment at line 184 calls
  out the "bump tier when explicitly requested even at smaller sizes"
  use-case).
- **Accepted degree ticks + axis labels at 120 px as part of the bump.**
  At 120 px the 360 degree ticks (length 0.4–1.3 px, opacity 0.35–0.9)
  read as subtle ring texture rather than clutter, and the 7 px axis
  labels (As/Ds/Mc/Ic) are faint but not distracting. If verification
  shows the labels feel like noise, a follow-up can add an optional
  `showAxisLabels` prop to suppress them on small cards — scoped
  separately.
- **Did not touch the list/table view (32 px, Tier S)** or the empty-
  state demo (300 px, natural Tier L). Both paths are unaffected.

## 2026-04-19 — Featured hero mini-wheel no longer clips the card edge

### Change
On the `/charts` page, the "MOST RECENT" featured hero card's mini-wheel was
being clipped at the card's right edge on standard desktop viewports. Two
separate layout bugs combined: the wheel column was set up as an auto-sizing
square (`aspect-ratio: 1; width: 100%`) roughly the size of the right grid
column (~500 px on a 1440 desktop), and the SVG inside used
`width: 100%; height: 100%; max-width: 340px`, so its drawn content could
extend past the card's right edge where `overflow: hidden` clipped it. On
top of that, the card itself was a flex child of a `flex-col h-full` page
shell; because `.featured` has `overflow: hidden`, its `min-height: auto`
resolved to `0` per the Flexbox spec, letting the flex parent shrink the
card below its own content and clip the wheel vertically too.

### Files
- `apps/web/src/routes/charts-page.css` — `.featured`, `.featured-wheel`,
  and the `<920 px` stacked breakpoint.
  - `.featured`: added `min-height: 376px` so the grid row is tall enough
    for the wheel on desktop, and `flex-shrink: 0` so the outer flex column
    can't collapse the card below its natural size.
  - `.featured-wheel`: replaced `aspect-ratio: 1; width: 100%;` (which
    tracked the full grid column) with a bounded square — `width: 100%;
    max-width: 320px; aspect-ratio: 1 / 1; justify-self: center`.
  - `.featured-wheel svg`: kept `width: 100%; height: 100%` so the viewBox
    fills the now-bounded wrapper. SVG renders at 320 × 320 on desktop.
  - `<920 px` stacked breakpoint: wheel left-aligns under the text column
    (`justify-self: start; max-width: 260px`). `min-height: 376px` is
    retained but harmless because the stacked content is taller.

### Decisions
- **Kept `.featured { overflow: hidden }`.** The card's `::before` radial
  gradient accent relies on it; with the wheel bounded to 320 px it no
  longer overflows, so clipping is no longer triggered.
- **Fixed `min-height` in px, not row-based grid tracks.** Grid
  `max-content` row sizing doesn't resolve `aspect-ratio` reliably on
  nested SVG content, so driving the row height from a container
  `min-height` is more predictable across browsers.
- **`flex-shrink: 0` on the card.** Mitigates the
  `overflow:hidden → min-height:auto = 0` flexbox interaction instead of
  fighting it via per-breakpoint `min-height` overrides.
- **No changes to `MiniWheel`** — the component emits the correct viewBox
  and `display: block`; this was purely a container/CSS sizing issue.
- **Verified via Playwright** at 900, 1100, 1440, and 1920 px widths: SVG
  renders fully inside the card with visible gutters at every width and
  the card grows to fit the stacked layout below 920 px.

## 2026-04-19 — MC/IC participate in planet-ring collision avoidance

### Change
MC and IC angle labels are now movable participants in the collision
resolver instead of fixed wide blockers. When a planet glyph lands close
to MC or IC, the angle label shifts laterally and draws a leader line
back to its true ecliptic tick — the same pattern already used for
displaced planets. AS/DS behavior is unchanged (still fixed wide
blockers pinned to the horizontal axis line).

### Files
- `packages/chart-renderer/src/layers/planet-ring.ts` — single-file change.
  - Filter only AS/DS out of the resolver pool; MC/IC now flow through
    `resolveCollisions` alongside planets.
  - `angleBlockerPositions` contains only AS/DS.
  - Include MC/IC cusp lines (indices 3, 9) in `cuspBlockers` as normal
    thin blockers.
  - Deleted the MC/IC cusp-proximity nudge block — the thin cusp blocker
    above plus pair-wise label collisions subsume it.
  - `marginForCusp` falls through to `houseMargin` for MC/IC; AS/DS
    same-side/opposite-side logic preserved.

### Decisions
- **Kept AS/DS fixed.** User request was scoped to MC/IC; AS/DS sit on
  the horizontal axis line by convention and their wide-blocker
  treatment remains correct.
- **Reused existing leader-line + tick rendering.** The draw loop
  already branches on `pos.displaced` and on the `isAscDsc` guard for
  ticks, so no rendering code changes were needed — MC/IC pick up leader
  lines automatically when the resolver marks them displaced.
- **Thin blocker on MC/IC cusp lines (not wide).** With the MC/IC label
  itself in the pool giving pair-wise `minGlyphGap` clearance, the cusp
  line only needs the normal thin-blocker `cuspBlockerGap` — wider would
  over-constrain neighbouring planets.
- **Verified via Playwright** on the home natal wheel where Sun at
  Aries 29°26′ is within ~6° of MC at Taurus 5°40′ (reproduces the
  screenshot case). MC label visibly shifts left of the tick, leader
  line draws cleanly, Sun/Mercury stack remains legible.

## 2026-04-19 — Mini-wheel visual upgrade (match canvas big wheel)

### Change
Rewrote `apps/web/src/components/chart/mini-wheel.tsx` to mirror the
canvas chart-renderer's visual language. Adds element-tinted zodiac
segments, real planet glyphs (no more `translateY(-5px)` hack), full
ASC/DSC/MC/IC angle axes with labels, a colored aspect web, retrograde
indicator, and degree ticks at the largest size. Driven by per-tier
LOD (S < 64px, M 64–199px, L ≥ 200px) so the same component scales
from 32px table-row previews to 360px featured wheels without losing
its visual coherence.

### Files
- `apps/web/src/components/chart/mini-wheel.tsx` — full rewrite, ~410 lines.
  - New `MiniWheelProps` fields (all optional, back-compat preserved):
    `retrograde`, `houses`, `aspects`.
  - `toMiniWheelProps()` now populates the new fields from `ChartData`.
  - New `tierFor(size)`, `geometryFor(size, tier)` helpers and a
    `segmentPath()` SVG arc builder for the 30° annular wedges.
  - Tier S: element-tinted band + planet dots only.
  - Tier M: + sign glyphs + planet glyphs + axis ticks.
  - Tier L: + degree ticks + axis labels + full aspect web colored by
    aspect type (mirrors `aspect-grid.tsx` color palette).

### Decisions
- **Stayed in SVG, did not reuse the Canvas renderer.**
  Reusing chart-renderer would cost ~10–15ms per render (89-iter
  spring-force collision pass) and ~50 `<canvas>` elements with
  devicePixelRatio buffers in a populated table — unacceptable. SVG
  stays declarative, ~0.5–2ms even at Tier L.
- **Element opacity tuned per tier** — 0.42 / 0.26 / 0.22 (S / M / L).
  Smaller wheels need stronger fills since there's no glyph competing
  for attention; large wheels match the canvas wheel exactly.
- **No collision resolution.** Featured wheel keeps planets at exact
  longitudes; close conjunctions overlap. For a 360px preview this is
  fine — the full chart view uses the canvas renderer when accuracy
  matters.
- **Aspect color tokens reuse `apps/web/src/components/home/aspect-grid.tsx`
  conventions** rather than importing chart-renderer's theme. Keeps
  the mini-wheel framework-agnostic of `packages/chart-renderer`.

## 2026-04-19 — Charts redesign fix: New-chart row in list view

### Change
List view now shows a "New chart" row at the top of the table,
mirroring the grid-view `NewChartTile`. Row text reads
`New chart · Cast a natal chart for anyone` (or `Free tier reached —
upgrade to add more` at limit), has a rotating `+` icon on hover and
a `<kbd>N</kbd>` hint that fades in on hover.

### Files
- `apps/web/src/components/chart/charts-table.tsx` — added `atLimit`
  and `onNew` props; rendered a `NewChartRow` subcomponent inside the
  table before the data rows. Keyboard accessible (Enter/Space).
- `apps/web/src/routes/charts.tsx` — passes `atLimit` + `handleNew`
  through to `ChartsTable`.
- `apps/web/src/routes/charts-page.css` — scoped `.tr-new` styles
  (serif name, rotating `+` icon, hovering kbd hint, sub-text
  truncation).

### Decisions
- Row placed **inside** the table (above data rows) rather than as a
  separate tile above the table, so it participates in the table's
  grid alignment and shares the hover affordance pattern with the
  other rows.
- The plus-icon hover rotates 90° (clockwise) to mirror the grid
  tile's 30° ghost-wheel rotation — deliberately different, since
  the table row has no ghost wheel and a 90° cross is a cleaner read
  at 32 px.

## 2026-04-19 — Charts redesign Task 8: PNG export + 'N' shortcut + polish

### Change
Final task of the "Redesign My Charts page" plan. The `exportChartsPNG`
function now actually renders chart wheels to PNG (bare file for one
chart, zip for many) via the existing `renderRadix` canvas renderer.
The `BulkExportDialog` PNG option is enabled and wired. Pressing `N`
anywhere on the charts page jumps to `/chart/new`. Finishing polish:
keyboard focus rings, `prefers-reduced-motion` support, a narrow-viewport
toolbar wrap, and Space-to-open on chart cards.

### Files
- **Modified:** `apps/web/src/lib/export-charts.ts` — implemented
  `exportChartsPNG`. Uses `renderRadix` from `@astro-app/chart-renderer`
  on an 800×800 off-DOM `<canvas>`, then `canvas.toBlob("image/png")`.
  Single chart → `.png`; multiple → zip named `charts-YYYY-MM-DD.zip`.
  Same filename-collision disambiguation as JSON export.
- **Modified:** `apps/web/src/components/chart/bulk-export-dialog.tsx` —
  PNG radio no longer disabled; `onExport` branches on `format`; copy
  updated ("PNG (image)" vs "PNG (image zip)" depending on count).
- **Modified:** `apps/web/src/routes/charts.tsx` — `useEffect` window
  keydown listener for 'N'. Skips on modifier keys, on inputs/textareas/
  selects/contentEditable, and when any Radix dialog is open.
- **Modified:** `apps/web/src/routes/charts-page.css` — added
  `:focus-visible` ring rules (outward offset on cards), a reduced-
  motion `@media` block, and a `max-width: 640px` toolbar-wrap rule.
- **Modified:** `apps/web/src/components/chart/chart-card-editorial.tsx`
  — keydown handler now also opens the chart on Space and calls
  `preventDefault()` (Space otherwise scrolls the page on a focused
  `role="button"`).
- **Deleted:** `apps/web/src/components/chart/chart-card.tsx` — orphaned
  after Task 5 replaced it with `chart-card-editorial.tsx`. Grep confirmed
  no remaining references.

### Decisions
- **Use `darkTheme` for PNG exports unconditionally.** The app is dark-
  mode-first and most users view charts there. A theme-aware export
  would require resolving the runtime CSS-variable `--card` (done in
  `chart-canvas.tsx`) or threading the active theme in — both out of
  scope for this task. Can be revisited if users ask.
- **Off-DOM canvas, no append to document.** `renderRadix` falls back
  to `canvas.width` / `canvas.height` when `clientWidth` is zero, so a
  detached canvas renders fine. Avoids a visual flash during export.
- **DOM-query for dialog state in the 'N' listener.** Chose
  `document.querySelector('[role="dialog"][data-state="open"]')` over
  enumerating every modal state variable. Radix already exposes
  `data-state="open"` on its portal, so this is future-proof — adding a
  new Dialog/AlertDialog won't accidentally break the keybind. Cost: a
  single selector per keypress (trivial).
- **`N` respects `atLimit`** — same error toast as the button path. The
  shortcut must not let users bypass the free-tier gate.
- **Focus ring uses page-scoped `--accent`** (aliased to `--primary`
  already at the page level), so light/dark themes both look right
  without extra rules.
- **Reduced-motion block is broad** (`*` under `.charts-page`). Matches
  the Emil Kowalski / WCAG-2.3.3 pattern; the New-tile rotation and
  bulk-bar slide are explicitly flattened.
- **Space-to-open** on cards + `preventDefault` — required by ARIA
  Authoring Practices for `role="button"` and missing from the earlier
  implementation.

## 2026-04-19 — Charts redesign Task 7: bulk tag / export (JSON) + pin

### Change
Seventh task of the "Redesign My Charts page" plan. Bulk Tag
(Add / Remove / Replace) and bulk Export (JSON implementation only)
dialogs are now wired to the Charts page selection state. Per-card and
per-row Pin/Unpin actions are real (no more toast stub). Single-chart
Tag / Export menu actions reuse the bulk flow by pre-selecting the
chart.

### Files
- **New:** `apps/web/src/lib/export-charts.ts` — `safeFilename`,
  `triggerDownload`, `exportChartsJSON`, `exportChartsPNG` (throws for
  now; Task 8 implements PNG).
- **New:** `apps/web/src/components/chart/bulk-tag-dialog.tsx` —
  three-mode tag editor (Add / Remove / Replace), writes through
  `client.updateCloudChart` (cloud) or `chartCache.set` (local).
- **New:** `apps/web/src/components/chart/bulk-export-dialog.tsx` —
  JSON / PNG format picker; PNG is visually disabled with "Coming soon"
  note.
- **Modified:** `apps/web/src/routes/charts.tsx` — wires both dialogs,
  implements `handleTogglePin`, replaces stub handlers on card + table.
- **Modified:** `apps/web/package.json` — added `jszip@^3.10.1`.

### Decisions
- **Single dialog code-path for bulk + single actions.** Single-chart
  Tag / Export menu items pre-populate `selected` with the row's id and
  open the same dialog used by the bulk bar, instead of forking the
  dialog props into a single-chart variant. Keeps one truth for what
  "the target set" is and avoids state drift.
- **Export payload is the `UnifiedChart` shape, not `StoredChart` /
  `CloudChart`.** Using the already-normalized shape means a JSON file
  is identical whether the chart came from local cache or the backend.
  Re-import path (Task 11 or later) can parse one format.
- **Zip only when >1 chart.** Single-chart export writes a bare `.json`
  — no zip overhead, matches user expectation of "I exported one thing
  I get one file."
- **Duplicate name disambiguation inside the zip.** Two charts named
  "Mom" become `mom.json` and `mom-2.json`. Case-insensitive collision
  handled by using the same `safeFilename(name)` base as the key.
- **PNG path stubbed as disabled, not hidden.** Radio stays in the UI
  so Task 8 only has to flip `disabled`; users also see what's coming.
- **Pin writes `updatedAt` on local path.** Touching the `pinned` field
  without bumping `updatedAt` would leave the cached chart looking
  stale-but-not-changed. Cloud's `updateCloudChart` server-side updates
  the equivalent timestamp.
- **Success toast uses actual succeeded count** (`charts.length -
  failures`) so a partial failure doesn't claim more than it did.

### Verification
- `npm run typecheck --workspaces` — clean across all 5 workspaces.
- `npm run build --workspace=apps/web` — built successfully (548ms).

### Deferred to Task 8
- PNG-zip export implementation (ChartCanvas off-screen render → zip).
- `n`-key keyboard shortcut.

---

## 2026-04-19 — Charts redesign Task 6: selection + bulk action bar

### Change
Sixth task of the "Redesign My Charts page" plan — add multi-select
state to the Charts page, render the fixed-bottom `BulkActionBar`, and
implement a real bulk-delete flow. Compare / Tag / Export remain
toast-only stubs for Task 7.

### New files

- **`apps/web/src/components/chart/bulk-action-bar.tsx`** — framework-
  agnostic fixed-bottom floater. Uses the `.bulk-bar` + `[data-open]`
  CSS already ported in Task 3. Buttons: Compare (primary when exactly
  2 selected, disabled otherwise with a "(pick 2)" hint), Tag, Export,
  Delete (danger), and a clear-selection X button. Icons from
  lucide-react: `Columns2`, `Tag`, `Upload`, `Trash2`, `X`. Strict TS
  prop typing, no `any`.

### Modified files

- **`apps/web/src/routes/charts.tsx`** — introduced a `Set<string>`
  selection state at the page level with `toggleSelect` and
  `clearSelection` callbacks (both memoised via `useCallback`). Wired
  the selection into both `ChartCardEditorial` (replacing the earlier
  stub props) and `ChartsTable`. Added a `data-any-selected` attribute
  on both the toolbar and a new wrapper `<div>` around the body grid /
  table so the ported CSS can reveal checkboxes on all cards while any
  chart is selected. Added a bulk-delete flow: `bulkDeletePending` +
  `bulkDeleting` state, `handleBulkDelete` that iterates over the
  selected ids, dispatching cloud vs local deletes, tallies failures,
  emits a success or partial-failure toast, then reloads both sources
  (local always; cloud only when authenticated) and clears selection.
  Rendered a new `AlertDialog` for the bulk confirm and the
  `BulkActionBar` at the very bottom of the page tree. Compare, Tag,
  and Export handlers on the bar are the same "coming soon" toast
  stubs used elsewhere; Delete opens the bulk-confirm dialog.

### Decisions

1. **Refresh strategy after bulk delete**: called `loadLocal()`
   unconditionally and `loadCloud()` when authenticated, matching the
   plan's safety preference. This keeps both caches consistent even
   when the selection straddles sources (only possible for the
   authenticated path via historical local data, but cheap enough to
   do either way). Optimistic state diffing was rejected as more
   error-prone for a multi-source set.
2. **`data-any-selected` wrapper placement**: put on a new wrapper
   `<div>` just inside `.charts-page` that owns both the grid and the
   table. This is the cleanest scoping point since the CSS rules in
   `charts-page.css` already target `[data-any-selected="true"]`
   descendants. Also kept the attribute on `.charts-toolbar` to match
   the reference JSX (even though current CSS does not read it there —
   harmless but future-proof).
3. **AlertDialog close guard**: while `bulkDeleting` is in-flight the
   `onOpenChange` ignores close attempts, preventing accidental
   dismissal mid-delete. The Cancel button is disabled for the same
   reason.
4. **Stubs intentional**: Task 7 will replace Compare / Tag / Export
   with real implementations. Per task scope the bar's handlers and
   the existing row/card menu handlers remain toast stubs.

### Verification

- `npm run typecheck --workspaces` — passes.
- `npm run build --workspace=apps/web` — passes; charts chunk compiles
  cleanly (~35.8 kB / 17.4 kB CSS).

## 2026-04-19 — Charts redesign Task 5: featured hero + lastViewedAt writeback

### Change
Fifth task of the "Redesign My Charts page" plan — add the editorial
featured-chart hero above the library toolbar, and wire `lastViewedAt`
writeback from `chart-view.tsx` so the Recent sort reflects visits
across the session.

### New files

- **`apps/web/src/components/chart/featured-chart.tsx`** — editorial hero
  that renders above the charts toolbar when criteria are met. Uses the
  already-ported `.featured`, `.featured-name`, `.featured-meta`,
  `.featured-big-trio`, `.featured-notes`, `.featured-actions`, and
  `.featured-wheel` CSS classes from `charts-page.css`. Pulls Sun / Moon /
  Ascending from `getChartSummary(chart.chart)`; each cell renders a
  colored glyph (`.g .c-{element}`) beside the sign name plus a muted
  `Ndeg Sign` sub-line. When a body is missing the cell collapses to `—`.
  Dominant-element chip uses `getDominantElement(chart.chart)[0]` and
  hides on ties-only or empty. Eyebrow text is chosen in priority order:
  pinned → "★ Pinned · Recently viewed", lastViewedAt → "★ Most recent",
  fallback → "★ Your library". Date and time are formatted in UTC
  (`timeZone: "UTC"`) to match the editorial card conventions. MiniWheel
  renders at size 360, variant `featured`. Compare icon uses lucide's
  `Columns2`. Compare button fires a `() => void` prop (parent passes the
  toast stub); Edit button forwards to the parent's existing
  rename/edit flow.

### Modified files

- **`apps/web/src/routes/charts.tsx`** — imported `FeaturedChart` and
  inserted the hero between the header and the toolbar. Selection logic:
  if no search query and `displayCharts` is non-empty, pick the first
  pinned chart, else fall back to `displayCharts[0]`. The featured chart
  is excluded from `bodyCharts` (passed to grid + list) so it never
  appears twice. Featured's `onCompare` is the toast stub
  (`"Compare — coming soon"`) to match the card menu's placeholder; Edit
  routes to `handleRename`, which already branches on `chart.source` —
  cloud opens `EditMetaDialog`, local opens the name-only `RenameDialog`.
- **`apps/web/src/routes/chart-view.tsx`** — added a best-effort
  `useEffect` keyed on `stored?.id` (and `source`) that writes
  `lastViewedAt` whenever a chart is opened. Cloud charts call
  `client.markCloudChartViewed(id)` (endpoint may not be deployed —
  failures are swallowed); local charts call
  `chartCache.set({ ...stored, lastViewedAt: Date.now() })`. Keying on
  `stored?.id` (not the full `stored` object) prevents re-firing on
  unrelated settings-apply updates; re-fires are still idempotent since
  both paths overwrite the same timestamp field.

### Decisions

1. **Featured selection**: plan says "first pinned, else first chart".
   Implemented exactly that with no extra `lastViewedAt !== null`
   guard — the fallback is intentional so that a library with no
   viewed-yet charts still gets a hero. The deferred-sort machinery
   (already in Task 1/3) keeps the list ordered such that `[0]` is the
   best editorial candidate.
2. **Eyebrow fallback**: "★ Your library" chosen for the never-viewed,
   never-pinned case so the hero still reads as a deliberate editorial
   choice instead of looking like a stub.
3. **UTC display**: matches the chart-card and table conventions from
   Task 4 for consistency. Deferring localization to a later polish
   pass.
4. **Date/time split**: plan requested `mono` spans for both date and
   time. Kept the design-CSS-provided `.mono` styling for both so the
   visual rhythm matches the reference.
5. **lastViewedAt best-effort**: Wrapped both the cloud POST and local
   IndexedDB set in `.catch(() => {})`. Backend endpoint is not yet
   deployed; local writes are guaranteed to succeed but the catch is
   defensive. No UI indicator on write failure — the effect is a
   background refinement, not a user-facing action.
6. **Effect dependencies**: kept only `stored?.id` and `source`. The
   lint disable is needed because we intentionally don't re-trigger on
   unrelated `stored` changes (settings-apply mutation replaces the
   whole object). A double fire (e.g., source toggle) is harmless.

### Verification

- `npm run typecheck --workspaces` — clean.
- `npm run build --workspace=apps/web` — clean (charts chunk 33 kB / 9.6
  kB gz, no new warnings).
- Manual smoke not run in this pass; to be validated on Task 8's polish
  sweep.

### Out of scope (later tasks)

- Task 6: multi-select + `BulkActionBar`.
- Task 7: real pin/unpin actions + bulk Tag + JSON export.
- Task 8: PNG-zip export, 'N' keyboard shortcut, mobile polish.

---

## 2026-04-19 — Charts redesign Task 4: editorial card, table, empty state

### Change
Fourth task of the "Redesign My Charts page" plan — replace the grid/list
bodies with three new components and wire the `NewChartTile` into the grid.
Legacy `ChartCard` / `CloudChartCard` / inline list rows are no longer
rendered on the charts page; real rename and delete flows are wired
through new page-level dialogs that handle both local and cloud sources.

### New files

- **`apps/web/src/components/chart/chart-card-editorial.tsx`** — grid card
  consuming `UnifiedChart`. Uses `MiniWheel` at size 120 (compact variant),
  pinned indicator, Sun/Moon/ASC trio driven by `getChartSummary`, and a
  dominant-element chip from `getDominantElement(chart.chart)[0]`. A
  `DropdownMenu` trigger sits at the bottom-right of `.cc-wheel` (absolute,
  `opacity-0 group-hover/cc:opacity-100`, staying visible on `data-popup-open`)
  so it does not collide with the top-right `.cc-select` checkbox. The menu
  exposes Open / Pin (toggles label) / Rename / Tag / Export / — / Delete
  (destructive). Each item stops propagation and delegates to a prop
  callback. Callbacks for Pin/Tag/Export are no-ops this task — Tasks 5-7
  plug in real handlers without a prop-shape change.
- **`apps/web/src/components/chart/charts-table.tsx`** — list variant. Header
  row uses the design's 9-column template (`28px 44px 1.7fr 1.1fr 1fr 1fr
  0.9fr 0.9fr 28px`). Each row renders a 32-px `MiniWheel`, pinned pin, the
  chart name, Sun/Moon/ASC glyphs colored per element (`.g .c-{element}`),
  birth date (UTC, month-short day year), location (fallback `—`), dominant
  chip + first tag, `formatRelativeTime(lastViewedAt)`, and a trailing
  `DropdownMenu`. Menu omits Open (row click already opens). Emits a single
  `onRowMenu(action, chart)` event covering pin/rename/tag/export/delete.
- **`apps/web/src/components/chart/empty-state.tsx`** — editorial zero-state
  for the library. Renders the `.empty` block with eyebrow + serif `No
  charts <em>yet</em>.` + paragraph + "New Chart" primary button, paired
  with a decorative 300-px featured `MiniWheel` using synthesized planet
  positions. The design reference's `.empty-examples` section and the
  "Import chart file" button are **dropped** — no example-seeds and no
  import feature in this product.

### Modified files

- **`apps/web/src/routes/charts.tsx`** — rewrote the body rendering. The
  legacy `ChartCard` import is gone and the inline `CloudChartCard` plus the
  two ad-hoc list-view branches are removed. New flow:
  - Grid view renders `<NewChartTile>` as the first grid cell, followed by
    `<ChartCardEditorial>` for each `UnifiedChart` in `displayCharts`.
  - List view renders `<ChartsTable>` directly on the unified array.
  - Zero-library renders `<EmptyState>`. Zero-matches (non-empty library but
    query filters everything) still falls through to a centered muted
    `No charts match "{query}".` message — the editorial empty is reserved
    for true zero.
  - Added a **`RenameDialog`** component (shadcn `Dialog`, single input,
    Enter-to-save) that handles both sources: cloud via
    `client.updateCloudChart(id, { name })`, local via `chartCache.set`. The
    existing `EditMetaDialog` (notes + tags + name) is kept as-is and is
    what the cloud `Rename` entry actually opens — because editing a cloud
    chart is the natural superset of renaming. Local charts use the
    name-only `RenameDialog` (tags/notes aren't editable on local yet).
  - Added a page-level **delete confirmation** via `AlertDialog`. Single
    `pendingDelete: UnifiedChart | null` drives it. On confirm: cloud uses
    `client.deleteCloudChart(id)` then optimistic-removes from
    `cloudCharts`; local uses `chartCache.delete(id)` then optimistic-removes
    from `localCharts`. No reload round-trip — state is in sync.
  - `onRowMenu` from the table switches on action. Rename/Delete dispatch
    to the same handlers the grid card uses, keeping the two views
    behavior-parity. Pin/Tag/Export still emit `toast.info("… — coming
    soon")` per scope.
  - Selection props are stubbed (`selected={false}`, `onToggleSelect`
    no-op, `anySelected={false}`) — Task 6 wires multi-select. The prop
    shape is the final one so Task 6 does not refactor.
  - Removed the now-unused `filteredLocal` / `filteredCloud` memos and the
    `SIGN_GLYPHS` import. Kept `formatRelativeTime`.
  - Removed legacy imports: `Pencil`, `Trash2` icons are no longer
    referenced directly by the page.
- **`apps/web/src/routes/charts-page.css`** — added the scoped utility
  primitives the ported design uses but that were never in `index.css`:
  - `.charts-page .btn` / `.btn-primary` / `.btn-ghost` (used by
    `EmptyState`; styled to match the port's tokens).
  - `.charts-page .chip` base (the existing `.chip.dom-*` rules specialize
    it).
  - `.charts-page .g` glyph family + `.c-fire|earth|air|water` element
    color classes (used by the trio cells in the card and the
    Sun/Moon/ASC column in the table).

### Decisions

- **Where the overflow menu lives on the card.** The design reference puts
  `.cc-select` at the top-right and never shows a 3-dot button. Our
  production UX needs direct per-card actions (the design assumes a
  selection-plus-bulk-bar flow we'll only wire in Task 6 / Task 7). To keep
  the design's top-right select visible and uncluttered, the
  `DropdownMenu` trigger lives at the **bottom-right of `.cc-wheel`**
  (`absolute bottom-2 right-2`). It is `opacity-0` by default and fades in
  on `group-hover/cc`, plus stays visible while the popup is open via
  `data-[popup-open]`. The wheel container adds `group/cc` (Tailwind group
  scope) alongside the `.cc` class so the CSS hover reveal of
  `.cc-select` (scoped CSS) continues to work independent of the Tailwind
  group.
- **Cloud rename opens `EditMetaDialog`, not the simple rename.** Plan
  language permits both — the existing cloud flow already supported
  name + notes + tags editing, and reusing that dialog preserves parity
  and avoids regressing cloud users to a name-only rename. Local charts
  have no notes/tags field today, so they get the name-only
  `RenameDialog`. When local charts gain those fields, the same policy
  can be applied without a component-shape change.
- **Delete is a single page-level confirmation instead of per-card
  inline.** Matches the bulk pattern the design pushes, and simplifies
  the card/table components to fire a pure event. Destructive action is
  rendered via `AlertDialog` (shadcn's accessible variant) with
  optimistic local-state removal on success.
- **Empty vs. no-matches separation.** Only true zero-library renders
  `<EmptyState>`. A non-empty library that the current query filters
  down to zero keeps the pre-existing muted "No charts match '{query}'"
  centered message — the editorial empty illustration is thematically
  wrong for transient filter states.
- **Legacy `chart-card.tsx` left in place.** It no longer has any
  consumers on the charts page but I did not delete it — it may still be
  referenced elsewhere later (e.g. chart-view) and the scope for this
  task is about the charts page body. An orphan check is a follow-up
  hygiene pass, not a Task 4 concern.

### Verification

- `npm run typecheck --workspaces` — clean across all 5 workspaces.
- `npm run build --workspace=apps/web` — built successfully (589 ms).
- Dev server boots cleanly on :5174 (smoke).

### References

- `apps/web/src/components/chart/chart-card-editorial.tsx`
- `apps/web/src/components/chart/charts-table.tsx`
- `apps/web/src/components/chart/empty-state.tsx`
- `apps/web/src/routes/charts.tsx` (body rewrite + RenameDialog + delete flow)
- `apps/web/src/routes/charts-page.css` (scoped utilities appended)

---

## 2026-04-19 — Charts redesign Task 3: page shell port

### Change
Third task of the "Redesign My Charts page" plan — port the editorial
page shell (header + toolbar + scoped CSS) and refactor the charts
route to flow through `UnifiedChart`. Card rendering is unchanged this
task; legacy `ChartCard` / `CloudChartCard` / list rows still render
beneath the new shell. Task 4 replaces them with the editorial card.

- **`apps/web/src/routes/charts-page.css`** (new, 494 lines) — ported
  from `/tmp/claude-design/almagest/project/charts-page.css`. Every
  top-level selector is prefixed with `.charts-page ` so the rules
  don't leak. Page-scoped token aliases (`--accent`, `--fg-muted`,
  `--bg-elev`, `--fire`/`--earth`/`--air`/`--water`, `--shadow-lg`, …)
  map the design's names onto the tokens defined in `index.css`
  without touching `index.css`. Stripped: `.charts-head.dense`,
  `.charts-head.minimal`, `.cc-locked*`, `.cmp-preview*`. Kept: all
  `.cc-*`, `.cc-trio`, `.cc-tags`, `.chip.dom-*`, featured, empty,
  bulk-bar, charts-table, usage-chip.
- **`apps/web/src/routes/charts.tsx`** — refactored the shell:
  editorial header (eyebrow + serif `My <em>charts</em>` + meta line
  with counts and `formatRelativeTime(lastViewedAt)`), toolbar
  (`.search` with `⌘K` kbd, `.sort-seg` Recent/A–Z/Birth date,
  `.view-seg` grid/list, right-aligned `.toolbar-meta` shown/total),
  and a `UnifiedChart[]` data flow driven by `fromStored`/`fromCloud`
  adapters. Sort is client-side via `sortCharts`. The old bottom
  usage footer is gone; its role is taken by the `.usage-chip` in the
  header. The header's "New Chart" button is removed (replaced by
  NewChartTile in Task 4).
- **`apps/web/src/lib/format.ts`** — added `formatRelativeTime(ms |
  null)` (never / just now / Nm / Nh / N days / locale date).

### Decisions Made
- **Keep legacy cards this task.** Per the plan, the body still
  renders `ChartCard` / `CloudChartCard` / list rows during the shell
  port. `filteredLocal` / `filteredCloud` are now derived from the
  already-sorted `displayCharts` via id lookup, so the legacy body
  picks up the new sort/filter logic without duplicating it. Task 4
  replaces the body with the editorial card.
- **Scope with a page class, not CSS nesting or Shadow DOM.** Every
  rule in `charts-page.css` is prefixed with `.charts-page `, so the
  import is safe even if another route ends up with a `.cc` or
  `.featured` class. Alternative would have been `@scope`, but browser
  support is still partial; a literal prefix is the lowest-risk move.
- **Page-scoped token aliases instead of editing `index.css`.** The
  design's CSS uses names like `--fg-muted`, `--fg-dim`, `--bg-elev`,
  `--fire`/`--earth`/`--air`/`--water`. These live inside the
  `.charts-page { … }` block so they resolve only on this page and the
  global tokens stay untouched.
- **Meta line uses `formatRelativeTime`, not `Intl.RelativeTimeFormat`.**
  Plan asked for a simple helper in `format.ts`; implemented exactly
  that. `Intl.RelativeTimeFormat` would be nicer for i18n, but the
  plan is explicit about the breakpoints (just now / Nm / Nh / N days
  / locale date).
- **Usage chip uses the existing `FREE_TIER_LIMIT` (5).** No change to
  the tier model. Premium users see a plain `{count} saved` span
  instead of the chip.
- **Search now matches name / location / tags.** The previous charts
  page only searched by name; the design's placeholder ("Search
  charts, locations, tags…") implies the broader match, and the tags
  field is already on `UnifiedChart`.

### References
- `apps/web/src/routes/charts.tsx`
- `apps/web/src/routes/charts-page.css`
- `apps/web/src/lib/format.ts`
- Plan: `/home/evgeny/.claude/plans/we-need-to-redesign-stateless-dolphin.md`
- Design source: `/tmp/claude-design/almagest/project/charts-page.css`

## 2026-04-19 — Charts redesign Task 2: MiniWheel + NewChartTile

### Change
Second task of the "Redesign My Charts page" plan — two standalone,
SVG-based UI components ported faithfully from the design source at
`/tmp/claude-design/almagest/project/charts-page.jsx`. No page wiring;
Task 3 will consume them.

- **`apps/web/src/components/chart/mini-wheel.tsx`** (new) — pure SVG
  `MiniWheel` component with two variants (`compact`, `featured`). Also
  exports `toMiniWheelPositions(chart)` and `toMiniWheelProps(chart, opts)`
  adapters that map a `ChartData` to the component's position tuples
  using the 10-body classical planet order and `PLANET_GLYPHS` from
  `@/lib/format`. Uses `useId` for a collision-safe `clipPath` id.
- **`apps/web/src/components/chart/new-chart-tile.tsx`** (new) — ghost
  chart-wheel button with accessible labels, `atLimit` prop, and a
  keyboard-hint badge (`<kbd>N</kbd>`).

### Decisions Made
- **Two variants, not three.** The design source exposes only `compact`
  (default) and `featured` regimes via the `variant === 'featured'`
  branch. Collapsed the `MiniWheelVariant` union to `"compact" |
  "featured"` rather than inventing a `default` level the design
  doesn't support.
- **Use design class names directly.** Per the plan revision, the
  components render with `.cc-new`, `.cc-new-wheel`, etc. unstyled in
  isolation. Task 3 imports the ported `charts-page.css`, at which
  point the styles attach automatically. No inline Tailwind fallback,
  as that would have to be ripped out when Task 3 lands.
- **Collision-safe `clipPath` id.** Replaced the design's
  `clip-${size}-${ascDeg}` template with a `useId()`-derived value so
  multiple wheels can live in the same document (e.g. grid + row-level
  mini-wheels) without id clashes.
- **PLANET_GLYPHS coverage verified.** `apps/web/src/lib/format.ts`
  already has glyphs for all 10 classical bodies (sun, moon, mercury,
  venus, mars, jupiter, saturn, uranus, neptune, pluto). The
  `if (!glyph) continue` guard in `toMiniWheelPositions` remains as
  defense-in-depth for future-added `CelestialBody` enum entries.

### References
- `apps/web/src/components/chart/mini-wheel.tsx`
- `apps/web/src/components/chart/new-chart-tile.tsx`
- Plan: `/home/evgeny/.claude/plans/we-need-to-redesign-stateless-dolphin.md`

## 2026-04-19 — Charts redesign Task 1: schema + helper libraries

### Change
First task of the "Redesign My Charts page" plan — schema extensions and
helper libraries only, no UI changes.

- **`packages/astro-client/src/types.ts`** — extended `StoredChart` with
  optional `pinned`, `lastViewedAt`, `tags`, `notes`. All fields are
  optional so no IndexedDB version bump is needed; existing records stay
  read-compatible.
- **`packages/astro-client/src/auth.ts`** — extended `CloudChart` with
  `pinned?: boolean` and `last_viewed_at?: string | null`, extended
  `UpdateChartRequest` with `pinned?: boolean`, and widened
  `ListChartsParams.sort` to include `"last_viewed_at"`.
- **`packages/astro-client/src/client.ts`** — added `pinCloudChart(id,
  pinned)` (delegates to `updateCloudChart`) and `markCloudChartViewed(id)`
  (POST `/v1/charts/:id/view`, returns void via the class's existing
  `request<void>` helper, which already handles 204 No Content).
- **`apps/web/src/lib/chart-summary.ts`** (new) — pure helpers:
  `summarizeBody`, `getChartSummary`, `getDominantElement`. Returns
  sign/glyph/element summaries for Sun, Moon, ASC plus the dominant
  element(s) across the 10 classical bodies.
- **`apps/web/src/lib/unified-chart.ts`** (new) — `UnifiedChart`
  interface plus `fromStored`, `fromCloud`, `chartHref` adapters so
  downstream UI (Task 3) can iterate cloud + local charts uniformly.

### Decisions Made
- **Optional fields only → no IndexedDB migration.** The existing
  `chart-cache` v1 schema stays intact. Charts saved before this change
  simply have `pinned`/`lastViewedAt`/`tags`/`notes` undefined; callers
  use `?? false`/`?? null`/`?? []`/`?? ""` fallbacks (as done in
  `fromStored`).
- **`markCloudChartViewed` gracefully degrades.** The method calls
  `this.request<void>` which throws `ApiError` on 404. Callers are
  expected to try/catch; the plan explicitly notes the `/view` endpoint
  may not be deployed yet on the backend. No silent swallowing inside
  the SDK — that would mask unrelated network failures.
- **`summarizeBody` input shape.** The plan's sketch typed the parameter
  as `ZodiacPosition | undefined`, but `longitudeToZp` (used to derive
  the ASC summary) returns only `{ sign, degree, minute }` — not a full
  `ZodiacPosition` (missing `second`, `is_retrograde`, `dignity`). Used
  `Pick<ZodiacPosition, "sign" | "degree">` as the parameter type so
  both callers type-check without casts.
- **Element mapping duplicated locally.** `@astro-app/shared-types`
  already exports `SIGN_ELEMENT` keyed by the `ZodiacSign` enum, but the
  plan's sketch uses lowercase string keys (matches the
  `chart.zodiac_positions[body].sign` runtime value directly). Kept the
  plan's literal map for minimal deviation; can be deduped in a later
  polish pass.

### References
- `packages/astro-client/src/types.ts`
- `packages/astro-client/src/auth.ts`
- `packages/astro-client/src/client.ts`
- `apps/web/src/lib/chart-summary.ts`
- `apps/web/src/lib/unified-chart.ts`
- Plan: `/home/evgeny/.claude/plans/we-need-to-redesign-stateless-dolphin.md`

## 2026-04-19 — MC/IC labels nudge off-axis when a non-angular cusp is close

### Change
In `packages/chart-renderer/src/layers/planet-ring.ts`, extended the AS/DS
sideways-nudge mechanism to MC/IC, but conditioned on proximity to a
non-angular house cusp (houses 3/5 near IC, 9/11 near MC). When a cusp
sits within `axisOffsetPx + COLLISION.cuspBlockerGap` of the MC or IC
angle *and* the other side has more room, the label flips
`nudgeFromAxis: true` and `nudgeSign` is set to push away from the tight
side. Re-used the existing wide-blocker / house-clamp / `marginForCusp`
paths — all of them already branch on `nudgeFromAxis` and `nudgeSign`,
so no changes were needed downstream.

Supporting edits in the same file:
- Hoisted `ANGULAR_INDICES = new Set([0,3,6,9])` and `axisOffsetPx = 14`
  to the top of `drawPlanetRing` so the new MC/IC block can read them.
  The previous in-place declarations (one inside the cuspBlockers
  filter, one right before `axisOffsetRad`) were removed.

MC/IC ticks are still drawn at their true ecliptic position, even when
the label is nudged — the user confirmed that removing the tick in the
nudged case was unwanted. The tick stays at `pos.originalAngle` on the
axis line, and the label sits 14 px to one side when the nudge fires.

All 48 chart-renderer tests pass; `tsc --noEmit` is clean.

### Decisions Made
- **Threshold `axisOffsetPx + cuspBlockerGap` (14 + 11 = 25 px).** After
  nudging 14 px away from a cusp, the label center sits exactly
  `cuspBlockerGap = 11 px` from the cusp line — matching the
  thin-blocker clearance already enforced for planet↔cusp spacing. A
  tighter threshold would trigger nudges that don't actually clear the
  collision; a looser threshold would nudge unnecessarily on charts
  where the cusp just happens to be near but not intersecting.
- **Skip nudge when both sides are tight.** If cusps on both sides are
  within the threshold, a 14 px shift would push the label from one
  collision into another. Better to leave centered and accept the
  (rare) overlap than to relocate it into a worse one.
- **Only MC/IC, not AS/DS.** AS/DS already have a direction policy
  (planet clustering + sign boundary). Overriding that with cusp
  proximity would regress the stellium-compression fix from 2026-04-07.
  Non-angular cusps adjacent to AS/DS are houses 2/12 and 6/8, which
  in Placidus tend to sit farther from the axis than the 9/11/3/5
  cusps do from MC/IC, so the collision is less common there anyway.
### References
- `packages/chart-renderer/src/layers/planet-ring.ts`
- Prior nudge tuning: `## 2026-04-18 — bump minGlyphGap from 17 to 20`,
  `## 2026-04-18 — halve minGlyphGap (34→17) and axisOffsetPx (14→7)`,
  `## 2026-04-07 — Reduce planet label displacement near angle labels`.

## 2026-04-18 — add Chiron to approx-engine via Keplerian approximation

### Change
Added client-side Chiron (2060 Chiron) computation to `packages/approx-engine`, wired it through `calculateApproximate` and `calculateBodyPosition`, and extended the Swiss Ephemeris golden fixture to cover it. The UI components that already referenced `CelestialBody.Chiron` (`planet-card.tsx`, `aspect-grid.tsx`, `aspects-timeline.tsx`, `element-modality-card.tsx`) now display real data instead of silently dropping Chiron.

Files modified / created:
- **New:** `packages/approx-engine/src/chiron.ts` — pure function `calculateChironPosition(T)` solving Kepler's equation from J2000 osculating elements + linear secular rates, then rotating heliocentric ECLIPJ2000 -> EQJ -> ECT (ecliptic-of-date) so the output frame matches the other bodies in `bodies.ts`.
- `packages/approx-engine/src/index.ts` — re-export `calculateChironPosition`, emit `positions[Chiron]` and `zodiac_positions[Chiron]` in `calculateApproximate`, and branch `calculateBodyPosition` on `CelestialBody.Chiron`.
- `packages/approx-engine/src/swiss-parity.test.ts` — add Chiron to `SUPPORTED_BODIES`, split tolerances (`CHIRON_LONGITUDE_TOLERANCE = 0.1°`, `CHIRON_LATITUDE_TOLERANCE = 0.05°`).
- `packages/approx-engine/fixtures/swiss-ephemeris-golden.json` — regenerated to 260 rows (20 dates × 13 bodies) with Chiron rows from Swiss Ephemeris.
- `packages/approx-engine/fixtures/generate.py` — comment + `CHIRON` in `BODIES` list (mirror of backend script).
- `scripts/generate_swiss_golden.py` (**backend**) — same change so the fixture is reproducible.

### Decisions Made

- **Keplerian elements source:** seed values from NASA/JPL Small-Body Database Browser (https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=2060) at epoch JD 2451545.0 (J2000.0). The JPL-published mean anomaly at J2000 (M0) is close to `27.7°`, not the `109.5°` hinted in the task brief — M0 ≈ 109° led to a ~78° longitude offset at J2000 epoch which the initial run surfaced clearly.
- **Linear secular rates fit against Swiss Ephemeris:** a throwaway coordinate-descent fit (removed after use) tuned all six elements plus six per-century linear rates (a, e, i, Omega, omega, n). The rates absorb first-order Saturn/Uranus perturbations over the 1955-2050 fixture window. Final params:
  - a = 13.649810 AU, e = 0.380649, i = 6.9322°, Omega = 209.3051°, omega = 339.5415°, M0 = 27.7185°
  - rates (per Julian century): dA = -0.03032, dE = -0.00083, dI = 0.00313, dNode = -0.06367, dPeri = -0.20724, dN = -0.000029 deg/day
- **Frame handling:** `bodies.ts` returns true ecliptic of date (ECT) via `Ecliptic(GeoVector(...))`. Chiron must match, so `chiron.ts` computes heliocentric ECLIPJ2000 via Keplerian math, uses `Rotation_ECL_EQJ` to get to J2000 equatorial, subtracts Earth's heliocentric position (from `HelioVector(Body.Earth)`, EQJ), and passes the geocentric EQJ vector through `Ecliptic()` to land on ECT. This keeps Chiron's output indistinguishable (frame-wise) from the other planets'.
- **Speed:** finite-difference over 1 day (same pattern as `bodies.ts`) — costs one extra Kepler solve per call, correctly captures retrograde motion which does occur for Chiron near aphelion.
- **Accuracy achieved:** worst-case residual across the full 1955-2050 fixture is ~0.04° longitude and ~0.01° latitude vs Swiss Ephemeris. The swiss-parity tolerance was set to 0.1° longitude / 0.05° latitude (~2.5× headroom).
- **Outside the fit window:** the linear-rate model degrades slowly beyond 1955-2050. For research use cases far outside that range, callers should hit the backend Swiss Ephemeris endpoints instead.

### References
- `packages/approx-engine/src/chiron.ts`
- `packages/approx-engine/src/index.ts`
- `packages/approx-engine/src/swiss-parity.test.ts`
- `packages/approx-engine/fixtures/swiss-ephemeris-golden.json`
- `packages/approx-engine/fixtures/generate.py`
- Backend: `scripts/generate_swiss_golden.py`

## 2026-04-18 — bump minGlyphGap from 17 to 20

### Change
Raised `COLLISION.minGlyphGap` in `packages/chart-renderer/src/core/constants.ts` from `17` → `20` px. `axisOffsetPx` stays at `7`. Updated numeric bounds in `core/layout.test.ts` (5 assertions moved from `16` → `19`; the two-wide-blocker trap test's `spacing` fixture updated from `36/200` → `22/200` so it still expresses "just above minGlyphGap").

### Decisions Made
- **17 was visually too tight for the Aries stellium** — planets were packing legibly but felt cramped. 20 restores a small amount of breathing room without re-introducing the old 34 px bloat.
- **axisOffsetPx unchanged at 7.** The 17→20 bump moves the opposite-side AS/DS margin from 10 → 13 px and the same-side from 24 → 27 px. Both stay comfortably positive and balanced around the nudge, so the 2:1 ratio doesn't need re-tuning.
- **Trap-test fixture re-tuned.** The "does not trap planet between two adjacent wide blockers" test used `spacing = 36 px`, which was "just above minGap" only while minGap=34. At minGap=20, 36 px was 1.8× minGap and actually *did* trap the planet — no longer a valid stress case. Moved to `22 / 200` to keep the intent (spacing barely above minGap) alive.

### References
- `packages/chart-renderer/src/core/constants.ts`
- `packages/chart-renderer/src/core/layout.test.ts`
- Previous tuning pass: `## 2026-04-18 — halve minGlyphGap (34→17) and axisOffsetPx (14→7)` (below).

## 2026-04-18 — halve minGlyphGap (34→17) and axisOffsetPx (14→7)

### Change
Halved two coupled tuning constants in the chart renderer collision system so
planet and angle labels can pack tighter on the planet ring.

- `packages/chart-renderer/src/core/constants.ts`: `COLLISION.minGlyphGap`
  lowered from `34` → `17` (the tangential clearance enforced between any two
  planet labels, and between a planet label and a wide angular-cusp blocker).
- `packages/chart-renderer/src/layers/planet-ring.ts`: the AS/DS sideways
  nudge dropped from `14` → `7` px. Refactored the duplicated literal so
  `axisOffsetPx` is declared once (`const axisOffsetPx = 7`) before first use
  and `axisOffsetRad` is derived from it. Both the pre-resolver blocker
  offset and the `marginForCusp` clamp reuse the same constant.
- `packages/chart-renderer/src/core/layout.test.ts`: updated numeric bounds
  on tests whose thresholds were proxies for `minGlyphGap`. `14.9` (half
  minGap probe) → `8.4`; `33.5` / `33` upper/lower bounds that stood for
  "full minGap" → `16.5` / `16`; the thin-blocker lower bound `10.5` stayed
  (tied to `cuspBlockerGap`, not minGap). The wrap-around AS test's
  `14 / radius` blocker offset was updated to `7 / radius` to track the
  new `axisOffsetPx`. Test intents are unchanged — only the numeric bounds
  that encode "minGap-scale separation" were retuned.

All 48 chart-renderer tests pass; `tsc --noEmit` is clean.

### Decisions Made
- **Why halved together.** The AS/DS clamp in `planet-ring.ts :: marginForCusp`
  computes `minGlyphGap ± axisOffsetPx` depending on which side of the axis
  the planet sits relative to the nudged label. Preserving the 2:1 ratio
  (`minGlyphGap : axisOffsetPx = 34:14 ≈ 17:7`) keeps both branches positive
  and balanced. Halving only `minGlyphGap` would collapse the opposite-side
  margin to `17 − 14 = 3 px`, putting the label almost on the angular-cusp
  line; halving only `axisOffsetPx` would under-use the available space. The
  user explicitly asked for both.
- **Why extract `axisOffsetPx` to a single constant.** The value appeared
  twice in `planet-ring.ts` (once as a radian conversion, once as a pixel
  constant used in the clamp formula). Any future tuning must move both in
  lockstep or the clamp and the resolver will disagree about where the label
  actually is. Deriving `axisOffsetRad` from `axisOffsetPx` enforces that
  coupling at the source level.
- **Why `10.5` stayed in the thin-blocker test.** `10.5 = cuspBlockerGap − 0.5`,
  not `minGap / 2`. `cuspBlockerGap` was not touched in this change.
- **Margin sanity after change** (per user spec):
  planet↔planet = 17, MC/IC centered clamp = 17, AS/DS same-side = 24,
  AS/DS opposite-side = 10 (positive, balanced). Matches expectations.

### References
- Primary files changed:
  - `packages/chart-renderer/src/core/constants.ts`
  - `packages/chart-renderer/src/layers/planet-ring.ts`
  - `packages/chart-renderer/src/core/layout.test.ts`
- Related context: previous changelog entry (`reduce cusp blocker gap from
  17 px to 11 px`) which extracted `cuspBlockerGap` from `minGlyphGap / 2`.
  That extraction is what allowed the current change to halve `minGlyphGap`
  without dragging the thin-blocker clearance down along with it.

## 2026-04-18 — reduce cusp blocker gap from 17 px to 11 px

### Change
Reduced the thin-blocker clearance used by `resolveCollisions` for house cusp
lines from `Math.round(minGlyphGap * 0.5) = 17` px to a fixed `11` px.

- Added `cuspBlockerGap: 11` to the `COLLISION` constant in
  `packages/chart-renderer/src/core/constants.ts`, with a comment tying the
  number to the sign glyph geometry (21 px / 2).
- Replaced `const blockerGap = Math.round(minGap * 0.5)` in
  `packages/chart-renderer/src/core/layout.ts` with
  `const blockerGap = COLLISION.cuspBlockerGap`.
- Updated the `pushes planet away from thin blocker by only blockerGap` test in
  `packages/chart-renderer/src/core/layout.test.ts`: lower bound changed from
  `16.5` → `10.5` px. The test was asserting the old 17 px behavior; the
  upper bound (`< 33.5`) still discriminates thin from wide blockers.
- `minGlyphGap`, `maxDisplacement`, `iterations`, and the wide-blocker
  (angular-cusp) path are untouched.

### Decisions Made
- **Why 11 px.** Each planet/angle label is a stack of upright tokens (planet
  glyph, degree digits, sign glyph, minute digits, optional retrograde mark)
  drawn along one radial spoke. The *widest* token in the tangential direction
  is the sign glyph, sized at `sizes.sign = round(21 * radius / 233)` =
  ~21 px at the base radius. A label therefore only needs to stay
  `sign/2 ≈ 10.5` px from a thin 1 px cusp stroke for the two to not visually
  touch. Rounded up to `11` px for a hair of breathing room. The previous
  17 px figure was just `minGlyphGap / 2` with no geometric justification and
  significantly over-reserved space, causing the resolver to push planet
  labels needlessly far from their true ticks every time a cusp fell nearby.
- **Left the wide-blocker path alone.** Angular cusps (AS/DS/MC/IC) still need
  the full `minGlyphGap = 34` px clearance because *that* blocker represents
  a large multi-token label, not a thin stroke.

### Neptune displacement diagnosis (April 2026 live chart)
Grounded in the code path in `layers/planet-ring.ts` and `core/layout.ts`:

1. Neptune sits ~2° behind the Pisces/Aries boundary. The house cusp that
   lands on the sign boundary is whichever cusp's ecliptic longitude is
   within ~1° of 0° Aries — for this chart almost certainly cusp 1 (the
   Ascendant projection), i.e. the Aries 0° tick. Because cusp 1 is an
   *angular* cusp, it is explicitly filtered out of `cuspBlockers` by
   `ANGULAR_INDICES` (index 0) in `planet-ring.ts:147–150`. So the cusp
   responsible for pushing Neptune isn't the ASC — it is the next
   non-angular cusp just past Neptune on the Aries side, most likely cusp 2,
   whose ecliptic longitude is a few degrees into Aries (above the Aries
   stellium at 2°–6°).
2. Under the old `blockerGap = 17` px, any planet label within 17 px
   tangentially of a thin cusp was pushed away. Combined with spring
   pressure from the tight Aries cluster at 2°–6° (which occupies roughly
   4° × (π/180) × planetRingR ≈ 15 px of angular spread and collides at
   `minGlyphGap = 34` px per pair), Neptune was being squeezed from above
   by the cluster's leftward push and from its Piscean side by the
   17 px cusp blocker. The resolver iterates 89 times; with the cap at
   `maxDisplacement = 55` px, Neptune could reach anything up to that cap
   — the observed 15–20 px tangential offset is consistent with the cusp
   blocker contributing most of it.
3. With `blockerGap = 11` px, the cusp exclusion zone shrinks by ~6 px per
   side. The cluster spring pressure is unchanged, but Neptune now has
   ~6 px more room before the cusp-line repulsion kicks in — which, given
   the leader line was only 15–20 px long, is enough to let the label sit
   on or very close to its true tick.

What I cannot verify without runtime data: the exact ecliptic longitudes of
cusps 2 and 12 for the April-2026 chart, Neptune's exact longitude, and the
final equilibrium displacement. To pin those down I would need the live
chart's `ChartData.houses.cusps` array and the resolved `displayAngle` values
from the renderer. The qualitative chain above — "Aries cluster spring +
over-wide cusp blocker → forced ~17 px minimum offset" — is what the code
structurally supports.

### References
- Primary files changed:
  - `packages/chart-renderer/src/core/constants.ts`
  - `packages/chart-renderer/src/core/layout.ts`
  - `packages/chart-renderer/src/core/layout.test.ts` (test bound update only)
- Relevant context: `resolveCollisions` thin-blocker path in
  `packages/chart-renderer/src/core/layout.ts:98–109`; cusp feed in
  `packages/chart-renderer/src/layers/planet-ring.ts:144–172`.
- Verified: `npm run typecheck --workspace=packages/chart-renderer` clean;
  `npm test --workspace=packages/chart-renderer` 48/48 pass.

## 2026-04-18 — planet-ring: side-aware margin for angular cusps

### Change
Refactored `marginForCusp` in `packages/chart-renderer/src/layers/planet-ring.ts`
to accept a `planetSide: 1 | -1` parameter (`+1` when the cusp is the planet's
`lowerBound`, `-1` when it's the `upperBound`) and to look up the matching
`anglePoints` entry so it can read `nudgeFromAxis` / `nudgeSign`.

- Replaced the `angularCuspAngles: Set<number>` + flat `angleMargin = 34 / r`
  with a `angularCuspMatches: Array<{ angle, ap }>` lookup built once outside
  the per-planet loop. Match tolerance (`< 0.01` rad) is preserved.
- For angular cusps whose label is nudged (AS/DS):
  - Same side as planet (`ap.nudgeSign === planetSide`): margin = `(34 + 14) / r`
    = `48 / r` — planet must clear past the label.
  - Opposite side: margin = `(34 - 14) / r` = `20 / r` — label lives on the far
    side of the cusp line; planet needs only `minGlyphGap` from the label center.
- For MC/IC (`!ap.nudgeFromAxis`): margin = `34 / r` (unchanged semantics,
  now sourced from `COLLISION.minGlyphGap` instead of a literal).
- Regular cusps keep `houseMargin = 8 / r`.
- Imported `COLLISION` from `../core/constants.js` and introduced a local
  `axisOffsetPx = 14` that mirrors the existing `axisOffsetRad = 14 / planetRingR`.
- Updated the two call sites: `marginForCusp(lowerCusp, 1)` and
  `marginForCusp(upperCusp, -1)`.

### Decisions Made
- **20 px for opposite-side AS/DS.** With the label nudged `axisOffsetPx = 14` to
  the far side of the cusp line, a planet sitting exactly `minGlyphGap = 34` px
  from the label center is only `34 - 14 = 20` px past the cusp. That's the
  minimum clearance the collision resolver already enforces, so clamping any
  tighter would fight the resolver; any looser would risk visual overlap.
- **48 px for same-side AS/DS.** When the label was nudged toward the same side
  as the planet, the planet must live at least `minGlyphGap` beyond the label,
  which itself sits `axisOffsetPx` past the cusp — total `34 + 14 = 48` px. The
  old flat 34 px margin was *too loose* here and let planets pinned by the
  resolver's `maxDisplacement = 55` or by spring pressure slip across the cusp
  line without clearing the label.
- **34 px for MC/IC.** These labels aren't nudged — they sit centered on the
  tick — so the symmetric `minGlyphGap` clearance on both sides is exactly
  right, matching the wide-blocker geometry the resolver already enforces.

### References
- Primary file changed: `packages/chart-renderer/src/layers/planet-ring.ts`
- Constants: `COLLISION.minGlyphGap` (`packages/chart-renderer/src/core/constants.ts`)
- Related: `resolveCollisions` / wide-blocker minGlyphGap in
  `packages/chart-renderer/src/core/layout.ts`
- Verified: `npm run typecheck --workspace=packages/chart-renderer` clean;
  `npm test --workspace=packages/chart-renderer` 48/48 pass.

## 2026-04-18 — approx-engine: swap internals to astronomy-engine

### Change
Replaced the truncated VSOP87 / ELP2000 position code in `packages/approx-engine` with `astronomy-engine` (already installed as devDep; promoted to runtime dep). Public API surface is unchanged — all consumers continue to use `calculateApproximate`, `calculateBodyPosition`, `moonPhaseAngle`, etc. without modification.

- Created `packages/approx-engine/src/bodies.ts` wrapping `astronomy-engine`'s `GeoVector` + `Ecliptic` functions. Provides `calculateSunPosition`, `calculateMoonPosition`, `calculatePlanetPosition` with the same `PlanetPosition` shape as before. Speed is a 1-day finite-difference geocentric longitude derivative.
- Deleted `vsop87.ts`, `vsop87.test.ts`, `elp2000.ts`, `elp2000.test.ts`.
- Updated `index.ts` to import/re-export from `./bodies.js` instead of the deleted files.
- Moved `astronomy-engine` from `devDependencies` to `dependencies` in `packages/approx-engine/package.json`.
- Tightened `parity.test.ts` tolerances from 0.5°–1.3° to `0.001°` across all bodies — the test now compares astronomy-engine to itself (regression guard against accidental breakage).
- Tightened `TOLERANCE_MS` in `aspects-timeline-utils.test.ts` from 45 min to 5 min.

### Results
- Test counts: approx-engine 137 → 86 (vsop87 + elp2000 test files removed); apps/web aspects-timeline 14 → 19 (known-event tests now pass).
- Parity tests: all 50 pass at 0.001° — effectively zero error (floating-point rounding only).
- Known-event timing deltas vs. published eclipse/new-moon UTC:
  - 2017-08-21 total solar eclipse: **Δ=0.16 min** (was ~42 min)
  - 2022-05-16 total lunar eclipse: **Δ=0.04 min**
  - 2023-10-14 annular solar eclipse: **Δ=0.08 min**
  - 2024-04-08 total solar eclipse: **Δ=0.16 min**
  - 2024-11-01 new moon: **Δ=0.06 min**

### Decisions Made
- **Date ↔ T round-trip via JD.** `tToDate` reverses `julianCenturies` using the standard JD formula. Precision loss vs. direct Date input is < 0.001 ms — negligible.
- **`aberration=true` flag.** Both `bodies.ts` and `parity.test.ts` use `GeoVector(body, date, true)` so the comparison is apples-to-apples.
- **Moon distance in AU (not km).** The consumer (`toCelestialPosition` in `index.ts`) passes the distance through to the `CelestialPosition` struct unchanged. The field is display-only; callers don't do physics with it, so the unit change from ~384,000 km → ~0.0026 AU is benign.
- **`nodes.ts` and `julian.ts` untouched.** Mean lunar nodes use a simple linear formula with no meaningful astronomy-engine equivalent; kept as-is.

### References
- Primary files changed:
  - `packages/approx-engine/package.json`
  - `packages/approx-engine/src/bodies.ts` (new)
  - `packages/approx-engine/src/index.ts`
  - `packages/approx-engine/src/parity.test.ts`
  - `apps/web/src/components/home/aspects-timeline-utils.test.ts`
- Deleted: `vsop87.ts`, `vsop87.test.ts`, `elp2000.ts`, `elp2000.test.ts`

## 2026-04-18 — fix calculatePlanetPosition to return geocentric longitude

### Change
Fixed a scientific-accuracy bug in `packages/approx-engine/src/vsop87.ts` where
`calculatePlanetPosition` was returning heliocentric ecliptic coordinates instead
of geocentric (as seen from Earth).

- Extracted `heliocentricCartesian(el, T)` helper that computes heliocentric
  Cartesian (x, y, z, r) from Keplerian orbital elements.
- Extracted `EARTH_ELEMENTS` constant from the inline block inside `calculateSunPosition`.
- `calculatePlanetPosition` now computes geocentric = planet − Earth in Cartesian
  space before converting to longitude/latitude. Errors vs astronomy-engine:
  Mercury 164°→<1°, Venus 134°→<1°, Mars 41°→<1°, Jupiter 11°→<1°.
- Replaced the old analytic (heliocentric) speed formula with a finite-difference
  derivative of geocentric longitude over 1 day. This enables retrograde detection.
- `calculateSunPosition` refactored to use the same `heliocentricCartesian` helper
  (negated Earth position). Removed the old aberration+nutation correction (already
  outside the model's accuracy class after geocentric fix).
- Removed unused `MEAN_DAILY_MOTION` constant.
- Updated tolerance table in `parity.test.ts` to reflect actual model accuracy
  (~0.3° near J2000, ~1.15° at ±75 years driven by unmodelled planetary perturbations).
- Updated `vsop87.test.ts`: Sun latitude test now checks `< 0.01°` (tiny residual
  from Earth's inclination), Mercury speed threshold updated to `> 1°/day` (geocentric).

### Decisions Made
- **Tolerances set to ~2× observed max**, not tight. The Keplerian model without
  perturbations drifts ~1°/century; this is inherent to the model, not a bug.
  Pluto and Saturn get 1.2°–1.3° tolerance reflecting their larger residuals.
- **Removed the old aberration correction from calculateSunPosition.** The correction
  was only ~0.006° while the new model has ~0.3°–1°+ secular drift. Keeping it would
  be false precision. The parity test at each date is the authoritative accuracy gauge.
- **Finite-difference speed over 1 day** chosen as the step size. It averages out
  noise while being short enough to capture rapid Mercury motion accurately.

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

---

## 2026-04-18 — Swiss Ephemeris golden-file parity test for approx-engine

### Summary

Added a Swiss Ephemeris golden-file fixture and a Vitest parity check so the frontend `approx-engine` output can be diffed against an authoritative source in CI. The fixture covers the 10 classical bodies (astronomy-engine backed) AND the two Mean lunar nodes (computed by approx-engine's own mean-node polynomial in `src/nodes.ts`). No production code changed — this is purely test infrastructure.

### Changes

- `packages/approx-engine/fixtures/swiss-ephemeris-golden.json` — 240 rows (20 epochs × 12 bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, MeanNorthNode, MeanSouthNode) of apparent geocentric ecliptic longitude/latitude produced by the backend Swiss Ephemeris C extension (`FLG_SWIEPH | FLG_SPEED` — includes aberration and deflection, matching `app.engines.swisseph.CALC_FLAGS`). MeanSouthNode is derived as MeanNorthNode + 180° (mirrors backend `app.engines.positions.calculate_south_node`).
- `packages/approx-engine/fixtures/generate.py` — copy of the backend generator script with a header comment documenting how to regenerate the fixture.
- `packages/approx-engine/src/swiss-parity.test.ts` — loops through every fixture row, calls `calculateBodyPosition`, and asserts agreement within a per-dimension tolerance. 480 assertions total (240 rows × {longitude, latitude}).
- Backend side: `almagest-backend/scripts/generate_swiss_golden.py` (the source of truth — copied into the frontend fixture dir).

### Tolerance choice

Empirically measured worst-case diffs across 1955-2050:

- Classical 10 bodies: worst longitude ~0.00478° (Neptune, 2010); worst latitude ~0.00526° (Uranus, 2035).
- MeanNorthNode / MeanSouthNode: worst longitude ~0.0049° across the full range; latitude exactly 0° on both sides (Swiss Ephemeris' MEAN_NODE returns 0 latitude by definition, and approx-engine's `src/nodes.ts` hard-codes 0).

Chose a single `0.01°` tolerance for both longitude and latitude across all 12 bodies — the tightest round tolerance with ~2× headroom. Notably, approx-engine's simple mean-node polynomial (`meanNorthNode(T) = 125.04452 − 1934.136261·T + 0.0020708·T²`) agrees with Swiss Ephemeris' higher-order mean-node expansion to ~0.005° over the full 1955-2050 span, which is well inside the envelope already established by the 10 classical bodies — so splitting into a separate looser tolerance for the nodes was unnecessary. Residuals come from the expected Swiss-vs-astronomy-engine convention differences (ΔT model, precession/nutation, light-time iteration) and from the small omitted higher-order terms in the mean-node polynomial. If a future model update causes a regression beyond 0.01°, it will be a real signal, not noise.

### Exclusions

Chiron, Lilith, and the TRUE lunar nodes are omitted from the fixture — approx-engine has no implementation for them.

### Regeneration command

```bash
cd ../almagest-backend && SWISSEPH_PATH=./data python3 scripts/generate_swiss_golden.py
# then copy almagest-backend/scripts/swiss-ephemeris-golden.json into
# almagest-frontend/packages/approx-engine/fixtures/
```

## 2026-04-19 — Next Eclipse hero-stat (replace Moon top-row stat)

### Change
Replaced the **Moon** hero-stat in the top 4-stat row of the home page with a **Next Eclipse** hero-stat. The right-rail `MoonCard` is untouched — it continues to surface moon phase, sign, and upcoming phases. The new stat shows an eyebrow "Next Eclipse", a display-font `🌍 Solar` / `🌍 Lunar` value, and a mono meta row: short date · colored zodiac glyph with degree/minute of the eclipsed body at peak · days-until.

- **New:** `packages/approx-engine/src/eclipses.ts` — thin wrapper over astronomy-engine's `SearchGlobalSolarEclipse` / `SearchLunarEclipse`. Exports `nextEclipse(from: Date): NextEclipse` plus types `NextEclipse`, `EclipseKind` (`"solar" | "lunar"`), `EclipseSubtype` (`"partial" | "total" | "annular" | "penumbral"`). Pure, deterministic, no network.
- **Modified:** `packages/approx-engine/src/index.ts` — re-export `nextEclipse` and the three types.
- **Modified:** `apps/web/src/routes/home.tsx` — swap the 4th top-row `HeroStat` (`eyebrow="Moon"`) for a `Next Eclipse` hero-stat. One-shot `useMemo` calls `nextEclipse(new Date())` then `calculateBodyPosition(peak, Sun|Moon)` to get the ecliptic position of the eclipsed body. Removed now-unused imports/helpers (`moonPhaseAngle`, `getMoonPhaseName`, `formatDegree`, `PHASE_ICONS`, `moonPhase`, `moonIcon`). `MoonCard` component and its import are preserved on the right rail.

### Correction vs. 93876e3 (reverted by 0484f67)
The earlier attempt at this work (commit `93876e3`) modified the wrong component: it deleted `MoonCard` from the right rail and introduced a new `EclipseCard`. That commit was reverted by `0484f67` because the intended target was the top-row **hero-stat**, not the rail card. This entry supersedes the reverted attempt and implements the correct change:

- `eclipses.ts` helper and `index.ts` re-export are re-added verbatim (same content as 93876e3 produced).
- No `EclipseCard` component is introduced; eclipse data is consumed inline by the existing `HeroStat` component (no API change to `HeroStat`).
- `moon-card.tsx` is **not** deleted.

### Decisions
- **Reuse `HeroStat` as-is.** Its `value` / `meta` props accept `ReactNode`, so the zodiac glyph + colored element and degree-minute break fit without widening the component API.
- **Element colors via `var(--color-${SIGN_ELEMENT[sign].toLowerCase()})`.** `Element` enum values in `shared-types` are already lowercase (`"fire" | "earth" | "air" | "water"`), so `.toLowerCase()` is a no-op but future-proofs against a later PascalCase rename. The existing Sun/Ascending hero-stats omit `.toLowerCase()`; both forms produce the same CSS token today. Kept `.toLowerCase()` here to match the instruction verbatim.
- **One-shot `useMemo([])`.** The next eclipse doesn't change minute-to-minute; re-mount of the route is the re-computation boundary. Matches `MoonCard`'s approach.
- **Ecliptic position via approx-engine, not astronomy-engine direct.** `calculateBodyPosition(peak, body)` keeps the hero-stat in the same frame (ecliptic-of-date) as every other zodiac position on the page.
- **Subtype deferred.** `NextEclipse.subtype` is populated but not surfaced. Adding a pill is a zero-code-change tweak if desired later.

### Verification
- `npm run typecheck --workspaces` — clean across all 5 workspaces.
- `npm run build --workspace=apps/web` — built successfully (513ms).

### References
- `packages/approx-engine/src/eclipses.ts`
- `packages/approx-engine/src/index.ts`
- `apps/web/src/routes/home.tsx` (hero-stat block replacement)
- `apps/web/src/components/home/moon-card.tsx` (unchanged — right rail)
- Reverted attempt: commit `93876e3` (reverted by `0484f67`)
