# Agent Changelog

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
- **`px-0` on every CardContent** — shadcn `CardContent` has `px-4` baked in. The project's custom `p-phi-3`/`p-phi-4` utilities aren't standard Tailwind, so `twMerge` can't dedupe them against `px-4` (both rules emit; cascade order decides). `px-0 p-phi-N` makes padding deterministic.
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
