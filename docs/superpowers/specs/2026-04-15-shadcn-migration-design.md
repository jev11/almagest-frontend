# shadcn/ui Migration — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Goal:** Adopt shadcn/ui across `apps/web` to replace ad-hoc custom components and produce a consistent, accessible UI foundation.

## Context

`apps/web` already has a partial shadcn/ui setup:
- `components.json` configured with `style: "base-nova"`, Tailwind v4, `@base-ui/react`
- `src/components/ui/` already contains: `button`, `dialog`, `switch`, `tooltip`, `skeleton`, `sonner`
- Many surfaces still use hand-rolled components with ad-hoc Tailwind classes

This migration extends shadcn coverage to remove inconsistency across forms, layout, and home/chart cards.

## Decisions

- **Driver:** consistency. The user wants a unified look/feel rather than just filling specific gaps.
- **Theming:** keep shadcn defaults for now. Tweak per-component when something clashes with the astrology palette. No upfront token mapping.
- **Strategy:** primitive inventory first, then surface-by-surface refactor. Foundation PR installs the full primitive set; subsequent PRs migrate one surface each.
- **Out of scope:** chart canvas, domain visualizations (chart-wheel, aspect-grid, aspects-timeline, distribution-overlay), already-shadcn components.

## Primitive Set (Foundation PR)

| Primitive | Surfaces using it |
|---|---|
| `card` | moon-card, planet-card, retrograde-tracker, element-modality-card, planetary-hours, chart-card |
| `input` | birth-data-form, date-time-picker, location-search, chart-card rename |
| `label` | every form field (replaces custom `labelClass` constant) |
| `select` | birth-data-form (4 native selects: house system, zodiac, ayanamsa, node type) |
| `dropdown-menu` | sidebar UserMenu, chart-card `⋯` menu |
| `popover` | location-search results dropdown |
| `separator` | planet-card, planetary-hours dividers |
| `badge` | planet-card DignityBadge, retrograde `℞` markers |
| `collapsible` | planet-card and planetary-hours expand/collapse |
| `progress` | planetary-hours progress bar |
| `alert` | birth-data-form `errors.submit` block |
| `alert-dialog` | chart-card delete confirmation |
| `avatar` | sidebar user initial |

Skipped primitives and the trigger to revisit each: `docs/ui-migration-skipped.md`.

## Migration Order

### PR 1 — Foundation
Install all primitives listed above using the shadcn CLI (`npx shadcn@latest add <name>` from `apps/web`). No application code changes.

Steps:
1. Use the shadcn MCP (`mcp__shadcn__list_items_in_registries`, `view_items_in_registries`) to verify each primitive in the set exists in the `@shadcn` registry under `style: base-nova` before adding.
2. Add `card` first as a smoke test. Run `npm run build`. Confirm the `base-nova` style resolves cleanly.
3. If any primitive is missing from `base-nova`, fall back to the default style for that one component (note in PR description).
4. Bulk-add the remaining primitives via the CLI.
5. Verify `npm run typecheck` and `npm run build` pass.

The shadcn MCP is helpful but not required — the CLI works standalone.

### PR 2 — Forms surface
Migrate `birth-data-form.tsx`, `date-time-picker.tsx`, `location-search.tsx`.
- 4 native `<select>` with custom chevrons → `Select`
- 5+ ad-hoc `<input>` + `<label>` → `Input` + `Label`
- location-search dropdown + custom outside-click → `Popover` + result list
- birth-data-form `errors.submit` → `Alert`

### PR 3 — Layout surface
Migrate `sidebar.tsx`. `mobile-tabs.tsx` and `app-layout.tsx` stay as-is.
- `UserMenu` (custom outside-click + escape) → `DropdownMenu`
- User initial circle → `Avatar`
- `NavButton` stays custom (collapse-state styling is app-specific; see skipped: `nav-menu`)

### PR 4 — Card wrappers
Wrap home/chart cards with `Card` / `CardHeader` / `CardContent`:
- `moon-card`, `planet-card`, `retrograde-tracker`, `element-modality-card`, `planetary-hours`, `chart-card`

Replace inner `border-t border-border my-phi-3` dividers with `Separator`.
Domain visualization internals (tables, SVG, glyph rendering) untouched.

### PR 5 — Interactive bits inside cards
- `DignityBadge` → `Badge`
- planet-card and planetary-hours expand/collapse → `Collapsible`
- planetary-hours progress bar → `Progress`
- chart-card delete confirmation → `AlertDialog`
- chart-card `⋯` menu → `DropdownMenu`

## Verification (per PR)

Required gates before merging each PR:
- `npm run typecheck` clean
- `npm run build` succeeds
- `npm run dev` — manually exercise affected routes
- Per-PR specifics:
  - PR 2: full birth chart calculation (form → submit → chart route)
  - PR 3: sidebar collapse/expand, user menu open/close, sign-out
  - PR 4: every home card renders with the same visual footprint
  - PR 5: rename/delete dialogs, planetary-hours expand, retrograde badges

## Risks

1. **`base-nova` registry coverage** — some primitives may not exist in `base-nova`. PR 1 smoke-test catches this; fall back to `new-york` per missing component.
2. **Token clashes with the astrology palette** — keeping shadcn defaults means each surface PR may require 1-3 className overrides (e.g. `primary` blue, custom `card` background). Expected and accepted.
3. **Behavior-equivalence drift** — shadcn primitives bring their own focus/keyboard behavior. Replacements for `UserMenu` and location-search dropdown need manual verification of focus traps, escape handling, and click-outside.

## Process Compliance

Per `CLAUDE.md`:
- Each PR commit references its phase/task number.
- After each PR, update `PHASE3_TASK_CHECKLIST.md` and `AGENT_CHANGELOG.md`.

## Acceptance Criteria

The migration is complete when all of these are true:
- Every primitive in the Primitive Set lives in `src/components/ui/`.
- Every surface listed in PRs 2-5 uses shadcn primitives where specified.
- No regressions in routes: `/`, `/chart/new`, `/chart/:id`, `/charts`, `/transits`, `/settings`.
- `docs/ui-migration-skipped.md` reflects final exclusions.
- `AGENT_CHANGELOG.md` has one entry per PR.

## Out of Scope

Files that will not be touched by this migration:
- `chart-canvas.tsx`, `distribution-overlay.tsx`
- `chart-wheel.tsx`, `aspect-grid.tsx`, `aspects-timeline.tsx`
- `error-boundary.tsx`, `error-card.tsx`
- `sonner.tsx`, `button.tsx`, `dialog.tsx`, `switch.tsx`, `tooltip.tsx`, `skeleton.tsx` (already shadcn)
- `mobile-tabs.tsx`, `app-layout.tsx` (already minimal)
- The `chart-renderer` package (framework-agnostic by design)
