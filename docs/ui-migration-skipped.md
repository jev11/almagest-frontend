# shadcn/ui Migration — Skipped Primitives

Primitives intentionally excluded from the initial shadcn/ui migration.
Revisit if a future need arises; document the trigger that would unskip.

## form (shadcn-form + react-hook-form)
- **Why skipped:** birth-data-form uses manual `useState` + custom validation. Adopting shadcn's `form` requires pulling in react-hook-form and zod (or similar) and rewriting validation. Larger lift than the rest of the migration; current form works.
- **Unskip when:** we add a second non-trivial form, or birth-data-form validation grows unwieldy.

## tabs
- **Why skipped:** no current surface uses tabbed navigation. The settings and transits routes don't need it today.
- **Unskip when:** a route needs tabbed sections (e.g. settings groups, chart detail views).

## sheet
- **Why skipped:** mobile navigation uses a fixed bottom tab bar, not a slide-in drawer. No off-canvas surfaces in the app.
- **Unskip when:** mobile filter panels, side drawers, or settings overlays are introduced.

## nav-menu
- **Why skipped:** sidebar's custom `NavButton` is a flat list of 4 items with collapse-state styling specific to this app's layout. shadcn's `nav-menu` is built for hoverable mega-menus and would be over-engineered here.
- **Unskip when:** navigation grows to nested menus or hover-revealed sub-items.

## command
- **Why skipped:** location-search uses a debounced async fetch against Nominatim. A `popover` + result list covers the UI; `command` adds keyboard navigation primitives we don't need yet.
- **Unskip when:** we add a global ⌘K command palette, or location-search needs full keyboard nav with section grouping.
