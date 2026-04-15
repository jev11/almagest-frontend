# shadcn/ui Migration — Technical Debt

What was deliberately left undone after the PR 1-5 shadcn/ui migration.
Two sections: primitives that weren't installed, and surfaces that still
contain ad-hoc UI patterns.

---

## Part 1 — Skipped primitives

Primitives intentionally excluded from the initial shadcn/ui migration.
Revisit if a future need arises.

### form (shadcn-form + react-hook-form)
- **Why skipped:** birth-data-form uses manual `useState` + custom validation. Adopting shadcn's `form` requires pulling in react-hook-form and zod (or similar) and rewriting validation. Larger lift than the rest of the migration; current form works.
- **Unskip when:** we add a second non-trivial form, or birth-data-form validation grows unwieldy.

### tabs
- **Why skipped:** no current surface uses tabbed navigation. The settings and transits routes don't need it today.
- **Unskip when:** a route needs tabbed sections — `chart-view.tsx` already has hand-rolled tab buttons (see Part 2) that would justify installing this.

### sheet
- **Why skipped:** mobile navigation uses a fixed bottom tab bar, not a slide-in drawer. No off-canvas surfaces in the app.
- **Unskip when:** mobile filter panels, side drawers, or settings overlays are introduced.

### nav-menu
- **Why skipped:** sidebar's custom `NavButton` is a flat list of 4 items with collapse-state styling specific to this app's layout. shadcn's `nav-menu` is built for hoverable mega-menus and would be over-engineered here.
- **Unskip when:** navigation grows to nested menus or hover-revealed sub-items.

### command
- **Why skipped:** location-search uses a debounced async fetch against Nominatim. A `popover` + result list covers the UI; `command` adds keyboard navigation primitives we don't need yet.
- **Unskip when:** we add a global ⌘K command palette, or location-search needs full keyboard nav with section grouping.

---

## Part 2 — Surfaces still containing ad-hoc UI

The PR 1-5 migration scope covered the shared component library (forms,
layout, home cards, chart card). Several **route-level** surfaces and one
**reusable** component still contain ad-hoc UI patterns that duplicate
already-installed shadcn primitives. Listed in priority order based on
effort vs. value.

### Trivial — single primitive swap

#### `apps/web/src/components/chart/chart-card.tsx` (rename input only)
- **Patterns:** native `<input type="text">` for the rename dialog; everything else in this file is shadcn (Card, AlertDialog, DropdownMenu).
- **Fit:** `Input`
- **Effort:** Trivial (~30 min)
- **Notes:** PR 5 D4 explicitly left this out of scope. Single edit.

### Small — straight repeats of patterns already migrated

#### `apps/web/src/routes/login.tsx`
- **Patterns:** native `<input>` (email, password) with conditional error borders; hand-rolled error pills below each field; custom form card with inline shadow.
- **Fit:** `Input`, `Label`, `Button`, `Alert`
- **Effort:** Small (2-4h)
- **Notes:** Same pattern as birth-data-form before PR 2. Direct repeat — copy the migration approach used there. Low risk.

#### `apps/web/src/routes/register.tsx`
- **Patterns:** native `<input>` (4 fields) with conditional error borders; hand-rolled error display per field; custom form card matching login.
- **Fit:** `Input`, `Label`, `Button`, `Alert`
- **Effort:** Small (2-4h)
- **Notes:** Same as login. Migrate together.

#### `apps/web/src/routes/transits.tsx`
- **Patterns:** native `<button>` chevron nav with custom hover; hidden `<input type="date">` overlaid on a styled label (click-to-show-picker); `text-primary` "Today" link button; inline `animate-spin` loader; plain `<table>` for planet positions.
- **Fit:** `Button` (variant="ghost" for chevrons + Today link), optionally `Card` for the planet table section.
- **Effort:** Small (2-4h)
- **Notes:** Date input intentionally minimal (native picker stays). Sliders/loaders don't have shadcn primitives. Low risk.

### Medium — multiple primitives, more state interaction

#### `apps/web/src/routes/settings.tsx`
- **Patterns:** native `<select>` with custom `selectClass` and `▼` chevron pseudo-element; hand-rolled `SelectWrapper` div; hand-rolled `SectionCard` and `Field` wrapper components; native `<input type="range">` for orb sliders; custom "Reset to defaults" button.
- **Fit:** `Select`, `Button`, `Card`, `Label` (range slider has no shadcn primitive — leave native).
- **Effort:** Medium (4-6h)
- **Notes:** The `SelectWrapper` is the same anti-pattern that birth-data-form had. The `SectionCard` reinvents `Card` with header/content slots. Low risk; mostly mechanical.

#### `apps/web/src/routes/chart-view.tsx`
- **Patterns:** native `<select>` (house system, zodiac, ayanamsa) with custom dropdown chevron wrapper; native `<input type="text">` for chart name in dialog; hand-rolled "Advanced settings" disclosure with manual `rotate-90` arrow; native Cancel/Apply buttons inside dialog; custom tab buttons at top with conditional active/inactive styling.
- **Fit:** `Select`, `Input`, `Label`, `Button`, `Collapsible`, plus `Tabs` (NOT YET INSTALLED — would unblock removing the hand-rolled tab buttons).
- **Effort:** Medium (6-8h)
- **Notes:** Triggers the `tabs` primitive unskip (see Part 1). Highest-value migration after the auth pages because the select pattern repeats again.

#### `apps/web/src/routes/charts.tsx`
- **Patterns:** native `<input>` for search with icon overlay; native `<button>` for view toggle (cards/list); `CloudChartCard` with hand-rolled hover effects + native edit/delete icon buttons; manual tag rendering as styled `<span>`s (not Badge); inline conditional delete confirmation dialog (not using Dialog primitive); custom progress bar for chart usage quota; `EditMetaDialog` with custom form layout.
- **Fit:** `Input`, `Button`, `Card`, `Badge`, `Dialog`, `AlertDialog`, `Progress`
- **Effort:** Medium (6-8h)
- **Notes:** `CloudChartCard` should mirror the `chart-card.tsx` pattern (Card + DropdownMenu + AlertDialog) we just landed in PR 4-5. Moderate risk due to interleaved cloud-sync state in the card component. Quota progress bar can use `Progress` (already installed for planetary-hours).

### Out of scope — appropriately custom

These are NOT debt; they are intentionally custom and serve a domain need:

- `apps/web/src/components/ui/error-card.tsx` — a domain-specific error component built from icon + message + retry. Could be assembled from `Alert` + `Button` but works well as-is.
- `apps/web/src/components/ui/error-boundary.tsx` — React error boundary, not a primitive concern.
- `apps/web/src/components/layout/mobile-tabs.tsx` — minimal bottom tab bar; flat `<button>`s with active/inactive styling. Could use `Button variant="ghost"` for consistency but the current approach is lean.
- `apps/web/src/routes/home.tsx` — route-level composition shell that assembles already-migrated child components. It does not duplicate form/control primitives on its own, so there is no meaningful shadcn migration value here.
- `apps/web/src/routes/chart-new.tsx` — thin wrapper around `birth-data-form` with simple centering/card layout. The only ad-hoc markup is the page shell, not a reusable primitive concern.
- `apps/web/src/components/chart/chart-canvas.tsx`, `distribution-overlay.tsx`, `home/chart-wheel.tsx`, `home/aspect-grid.tsx`, `home/aspects-timeline.tsx` — domain visualizations using canvas/SVG; intentionally framework-agnostic per project conventions.

---


## Recommended cleanup order

If a future "PR 6" pass is funded:

1. **Bundled auth + settings + chart-view migration** (~10-12h, low-medium risk)
   - login + register first (smallest, validates the pattern)
   - then settings (lifts `Card` + `Select` reuse)
   - then chart-view (triggers `tabs` primitive install)
2. **chart-card rename input** (~30 min, trivial; can ride along with #1)
3. **transits surface** (~2-4h, low risk, can ride along with #1)
4. **charts.tsx + CloudChartCard** (~6-8h, separate PR — more state to reason about)

Total estimated effort to fully eliminate ad-hoc UI: **~16-24 hours**.
