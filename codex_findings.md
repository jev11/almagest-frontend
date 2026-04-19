# Codex Findings

## Scope

This review covers the current test suite in this repository as of 2026-04-18. The goal was to identify:

1. Code that is not covered by the current tests.
2. Code that appears unused, unreachable, or only reachable from demo/manual tooling.

## Methodology

I used four sources of evidence:

1. `npm test` at the workspace root to see which tests currently run and whether the suite is green.
2. A file-level import graph over `apps/web/src` and `packages/*/src`, starting from:
   - all `tests/**/*.test.ts[x]` files for test reach
   - `apps/web/src/main.tsx` for application reach
   - chart-renderer demo and manual visual harness entrypoints for demo/manual reach
3. `npm run typecheck`.
4. A stricter TypeScript pass with `--noUnusedLocals --noUnusedParameters --allowUnreachableCode false` for each workspace.

Important limitation:

- The repo does not currently have a Vitest coverage provider installed. In particular, `@vitest/coverage-v8` is not present, so this report is not a line/branch coverage report.
- "Untested" below means "not reached by the current automated test entrypoints at module level". It is still a strong signal, but not identical to statement coverage.

## Executive Summary

- The test suite contains 19 test files.
- The current suite is not fully green. `npm test` fails in `tests/apps/web/src/lib/format.test.ts` because the implementation returns zodiac glyphs with a variation selector, while the assertions expect the plain glyph.
- At file level, 68 source modules are not reached by the current test entrypoints.
- The largest gap is `apps/web`: route components, UI wrappers, shell wiring, several hooks, and the most important integration components are untested.
- I did not find strong evidence of unreachable product modules at file level.
- I did find a small amount of likely unused exported code and one demo-only dataset module.

## Current Test Status

`npm test` runs tests in:

- `tests/packages/approx-engine/**/*.test.ts`
- `tests/packages/astro-client/**/*.test.ts`
- `tests/packages/chart-renderer/**/*.test.ts`
- `tests/apps/web/**/*.test.ts`

Observed failures:

- `tests/apps/web/src/lib/format.test.ts:30`
  - Expected `♈ 15°30′`
  - Received `♈︎ 15°30′`
- `tests/apps/web/src/lib/format.test.ts:102`
  - Expected `♈`
  - Received `♈︎`

This means the suite still gives useful signal, but the web workspace is currently red.

## Coverage Summary

The file-level import graph found 122 source modules under `apps/web/src` and `packages/*/src`.

- 54 modules are reached by the current tests.
- 68 modules are not reached by the current tests.

The gaps are concentrated in runtime integration code rather than pure logic.

## High-Risk Untested Areas

These are the most important uncovered modules because they coordinate multiple systems or contain stateful/browser behavior.

### 1. App shell, routing, theme sync, and auth sync

- `apps/web/src/App.tsx`
  - `ThemeSync` at line 29
  - `AuthSync` at line 54
  - `AppProviders` at line 68
  - `App` at line 95

Why this matters:

- No tests currently exercise route registration, lazy route loading, theme class toggling, or token synchronization into the astro client.
- Regressions here would break the entire application without being caught by the current suite.

### 2. Chart creation flow

- `apps/web/src/components/forms/birth-data-form.tsx:50`

Why this matters:

- This component contains validation, time zone conversion, chart calculation, local persistence, conditional cloud persistence, premium/free-tier handling, toast flows, and navigation.
- The mutation path from line 92 onward and the cloud-sync branch from line 106 onward are especially important and currently untested.

### 3. Chart rendering integration

- `apps/web/src/components/chart/chart-canvas.tsx:34`

Why this matters:

- This is the integration point between app state and `@astro-app/chart-renderer`.
- It contains node filtering, theme resolution, DOM observation, resize handling, and the branch that chooses `renderRadix` vs `renderBiwheel`.
- The core rendering branch is at lines 88 to 91 and is currently untested from the app side.

### 4. Current sky live-data flow

- `apps/web/src/hooks/use-current-sky.ts:10`

Why this matters:

- This hook orchestrates approximate client-side calculation, geolocation, settings-driven aspect recalculation, background precise fetches, and retry behavior.
- The approximate bootstrap path at lines 23 to 39, geolocation update path at lines 42 to 71, precise fetch path at lines 88 to 118, and defaults-reset path at lines 141 to 156 are all untested.

### 5. Stored chart management

- `apps/web/src/routes/charts.tsx:263`
- `apps/web/src/components/chart/chart-card.tsx:41`
- `apps/web/src/routes/chart-view.tsx:57`

Why this matters:

- These components cover IndexedDB cache reads/writes, cloud chart listing, optimistic UI, search/filtering, persisted view mode, and chart metadata editing/deletion.
- They are all user-facing flows and currently have no direct automated coverage.

### 6. Chart-renderer biwheel pipeline

- `packages/chart-renderer/src/core/renderer.ts:45`
- `packages/chart-renderer/src/core/renderer.ts:103`
- `packages/chart-renderer/src/charts/biwheel.ts:78`
- `packages/chart-renderer/src/charts/biwheel.ts:174`

Why this matters:

- Existing chart-renderer tests cover geometry, layout, glyphs, and SVG output, but not the canvas biwheel pipeline and its inter-chart aspects/transit ring behavior.
- The code most likely to regress visually in non-trivial ways is currently outside the automated suite.

## Untested Modules By Area

### apps/web app shell

```text
apps/web/src/App.tsx
apps/web/src/main.tsx
```

### apps/web components/chart

```text
apps/web/src/components/chart/chart-canvas.tsx
apps/web/src/components/chart/chart-card.tsx
```

### apps/web components/forms

```text
apps/web/src/components/forms/birth-data-form.tsx
apps/web/src/components/forms/date-time-picker.tsx
apps/web/src/components/forms/location-search.tsx
```

### apps/web components/home

```text
apps/web/src/components/home/aspect-grid.tsx
apps/web/src/components/home/aspects-timeline.tsx
apps/web/src/components/home/chart-wheel.tsx
apps/web/src/components/home/element-modality-card.tsx
apps/web/src/components/home/hero-stat.tsx
apps/web/src/components/home/moon-card.tsx
apps/web/src/components/home/planet-card.tsx
apps/web/src/components/home/planetary-hours.tsx
apps/web/src/components/home/retrograde-tracker.tsx
```

### apps/web components/layout

```text
apps/web/src/components/layout/app-layout.tsx
apps/web/src/components/layout/mobile-tabs.tsx
apps/web/src/components/layout/sidebar.tsx
```

### apps/web components/ui

```text
apps/web/src/components/ui/alert-dialog.tsx
apps/web/src/components/ui/alert.tsx
apps/web/src/components/ui/avatar.tsx
apps/web/src/components/ui/button.tsx
apps/web/src/components/ui/card.tsx
apps/web/src/components/ui/chart.tsx
apps/web/src/components/ui/collapsible.tsx
apps/web/src/components/ui/dialog.tsx
apps/web/src/components/ui/dropdown-menu.tsx
apps/web/src/components/ui/error-boundary.tsx
apps/web/src/components/ui/error-card.tsx
apps/web/src/components/ui/input.tsx
apps/web/src/components/ui/label.tsx
apps/web/src/components/ui/popover.tsx
apps/web/src/components/ui/select.tsx
apps/web/src/components/ui/separator.tsx
apps/web/src/components/ui/skeleton.tsx
apps/web/src/components/ui/sonner.tsx
apps/web/src/components/ui/switch.tsx
apps/web/src/components/ui/tooltip.tsx
```

### apps/web hooks

```text
apps/web/src/hooks/use-auth.ts
apps/web/src/hooks/use-current-sky-types.ts
apps/web/src/hooks/use-current-sky.ts
apps/web/src/hooks/use-reverse-geocode.ts
apps/web/src/hooks/use-sidebar.ts
apps/web/src/hooks/use-timezone.ts
```

### apps/web routes

```text
apps/web/src/routes/chart-new.tsx
apps/web/src/routes/chart-view.tsx
apps/web/src/routes/charts.tsx
apps/web/src/routes/home.tsx
apps/web/src/routes/login.tsx
apps/web/src/routes/register.tsx
apps/web/src/routes/settings.tsx
apps/web/src/routes/transits.tsx
```

### packages/astro-client

```text
packages/astro-client/src/index.ts
packages/astro-client/src/snap.ts
```

Notes:

- `packages/astro-client` has good tests around `client.ts`, `cache.ts`, and `hooks.ts`, but the public barrel is not exercised and `snap.ts` is not exercised.

### packages/chart-renderer other

```text
packages/chart-renderer/src/charts/biwheel.ts
packages/chart-renderer/src/core/renderer.ts
packages/chart-renderer/src/glyphs/index.ts
packages/chart-renderer/src/index.ts
packages/chart-renderer/src/themes/index.ts
```

### packages/chart-renderer layers

```text
packages/chart-renderer/src/layers/aspect-web.ts
packages/chart-renderer/src/layers/background.ts
packages/chart-renderer/src/layers/chart-info.ts
packages/chart-renderer/src/layers/house-overlay.ts
packages/chart-renderer/src/layers/planet-ring.ts
packages/chart-renderer/src/layers/types.ts
packages/chart-renderer/src/layers/zodiac-ring.ts
```

## Unused or Likely Dead Code

### 1. `SnapController` export path appears unused in this repo

Evidence:

- `packages/astro-client/src/snap.ts`
  - `SnapController` is defined at line 12.
  - `createSnapController` is defined at line 38.
- `packages/astro-client/src/index.ts:6`
  - Both are re-exported from the package barrel.
- Repo-wide search found no consumers outside `snap.ts` and the barrel.

Assessment:

- This looks like genuinely unused exported API surface inside this repository.
- It may exist for future use or external consumers, but there is no evidence of current in-repo usage.

### 2. `useNatalChart` and `useTransitChart` appear unused inside this repo

Evidence:

- `packages/astro-client/src/hooks.ts:24`
  - `useNatalChart`
- `packages/astro-client/src/hooks.ts:40`
  - `useTransitChart`
- Repo-wide search found exports and definitions, but no callers in `apps/`, `packages/`, or `tests/`.

Assessment:

- These hooks are likely dead internal API for the current app.
- If they are intended public package API, that is fine, but they are still unused by the web app in this repository.

### 3. `packages/chart-renderer/src/test-data/transit-chart.ts` is demo-only

Evidence:

- `TRANSIT_CHART` is exported at line 16.
- `ALL_RETROGRADE_CHART` is exported at line 110.
- The file is consumed by the manual visual harness at `packages/chart-renderer/test/visual/main.ts`
  - import at line 5
  - chart registry at lines 19 to 23
  - biwheel usage at lines 58 to 61
- It is not used by the application and is not reached by automated tests.

Assessment:

- This is not dead code if the manual visual harness is intentionally maintained.
- It is demo/manual-only support code, not production runtime code.

## What I Did Not Find

I did not find convincing evidence for:

- unreachable statements rejected by TypeScript
- unused locals or unused parameters rejected by TypeScript
- fully unreachable production modules with no app, demo, or test path at all

The stricter TypeScript pass completed cleanly across all workspaces.

## Interpretation

The repo's automated test suite is strongest in:

- numerical logic in `approx-engine`
- client/cache internals in `astro-client`
- geometry/layout/SVG generation in `chart-renderer`
- a small subset of web utility logic in `apps/web/src/lib`, `use-settings`, `sky-store`, and `aspects-timeline-utils`

The suite is weakest in:

- React integration flows
- router-level behavior
- browser API interaction
- IndexedDB plus network plus UI integration
- canvas rendering integration
- chart lifecycle flows from form submission to viewing/editing/deleting charts

In practice, that means many of the most user-visible regressions would not currently be caught by the automated suite.

## Recommended Test Priorities

### Priority 1

Add integration tests for:

- `apps/web/src/App.tsx`
- `apps/web/src/components/forms/birth-data-form.tsx`
- `apps/web/src/components/chart/chart-canvas.tsx`
- `apps/web/src/hooks/use-current-sky.ts`

These cover the most important wiring and the most stateful behavior.

### Priority 2

Add route-level tests for:

- `apps/web/src/routes/charts.tsx`
- `apps/web/src/routes/chart-view.tsx`
- `apps/web/src/routes/home.tsx`
- `apps/web/src/routes/transits.tsx`

These are key user journeys and exercise cache/network/rendering behavior together.

### Priority 3

Add chart-renderer tests for:

- `renderBiwheel`
- transit-ring rendering
- inter-chart aspect rendering
- individual layer orchestration through `core/renderer.ts`

### Priority 4

Decide what to do with likely unused exports:

- remove `SnapController` if obsolete
- remove `useNatalChart` and `useTransitChart` if obsolete
- keep `transit-chart.ts` only if the manual visual harness is intentionally part of the maintenance workflow

## Bottom Line

The repo has decent logic-level coverage, but weak application-level coverage. The main problem is not pure math or utility code. The main problem is missing tests around the real user flows and the code that integrates React, router state, browser APIs, local persistence, network requests, and canvas rendering.

The only clearly likely-unused code I found is unused exported API in `packages/astro-client/src/snap.ts` and the unused-in-repo query hooks in `packages/astro-client/src/hooks.ts`. The only fully non-production source file that stands out is the demo-only chart dataset in `packages/chart-renderer/src/test-data/transit-chart.ts`.
