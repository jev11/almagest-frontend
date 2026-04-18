# Element × Modality Donut Charts

**Date:** 2026-04-18
**Area:** `apps/web` — home page, Element × Modality card
**Status:** Spec

## Goal

Add two donut charts ("Elements" and "Modalities") to the bottom of the existing Element × Modality card on the home page, visualising which element and which modality dominate the user's chart. Reference design supplied by the user: thin donut rings with count labels on each slice and the dominant label centered inside the ring.

## Motivation

The grid shown by `element-modality-card.tsx` communicates *where* each body sits in the element×modality matrix but requires the reader to tally slices mentally to answer the most common question ("which element / modality dominates this chart?"). The donuts answer that question at a glance and keep the interaction with the existing grid — same data, new summary.

## Non-goals

- No interaction (tooltips beyond shadcn's built-in hover are not required).
- No legend outside the ring — slice counts and the central dominant label are sufficient.
- `distribution-overlay.tsx` behaviour is unchanged aside from importing the shared helper.
- No new chart features elsewhere (transits, chart-view) — scoped to the one card.

## Visual design

Two donuts, side-by-side, below the existing grid inside the same `Card`, separated by a horizontal rule matching the card's border style.

- Column labels above each donut: `ELEMENTS`, `MODALITIES`, small caps, `text-muted-foreground`, same style as the grid column headers.
- Donut proportions follow shadcn's "Pie Chart - Donut with Text" template: square aspect, `innerRadius ≈ 60`, `strokeWidth ≈ 5`.
- Slice labels: count value rendered on each slice, centered on the slice arc, using `recharts`'s `<Pie label>` with `fill` forced to a high-contrast color (white for colored slices, zero-count slices are omitted so they carry no label).
- Center text: dominant category name. Ties stack vertically — top label above the center, bottom label below — using two `<tspan>` elements offset symmetrically around `viewBox.cy` (e.g. `cy − 10` and `cy + 10`). Three-way ties stack all three.

### Colors

- **Elements donut** — existing CSS tokens: `--color-fire`, `--color-earth`, `--color-air`, `--color-water`.
- **Modalities donut** — purple palette derived from `--primary`:
  - Cardinal: `var(--primary)`
  - Fixed: `color-mix(in oklch, var(--primary) 70%, var(--background))`
  - Mutable: `color-mix(in oklch, var(--primary) 45%, var(--background))`
  This avoids the current noisy mix (fire / primary / air) used by `distribution-overlay.tsx`.

## Data

### Shared helper

Extract the existing `computeDistribution` function out of `distribution-overlay.tsx` into a new shared module:

- **Path:** `apps/web/src/lib/astro-distribution.ts`
- **Exports:**
  - `type Modality = "Cardinal" | "Fixed" | "Mutable"`
  - `const SIGN_MODALITY: Record<ZodiacSign, Modality>`
  - `computeDistribution(chartData, bodies): { elements: Map<Element, number>; modalities: Map<Modality, number>; total: number }`
- `bodies` is a required argument (no default) so each caller makes the body-set explicit.

### Body set for the card

`element-modality-card.tsx` already enumerates 11 bodies including Chiron. The donuts must count the same 11 so the rings never contradict the grid above them. `distribution-overlay.tsx` continues to pass its own 10-body list (no Chiron) unchanged.

### Shape fed to recharts

Each donut receives a `{ key, label, count, fill }[]` array with zero-count entries filtered out (recharts renders empty slices oddly when counts are 0).

### Dominant label

Compute `max = Math.max(...counts)`; the dominant list is every entry whose count equals `max`. Passed to the center `<Label content>` as an array, which renders one `<tspan>` per entry, vertically centered around `viewBox.cy`.

## Component shape

Keep the new chart markup inline in `element-modality-card.tsx` as a single private sub-component `ElementModalityPies` (no new file). The card is the only consumer, and keeping them co-located makes the element/modality color mapping and body set reuse obvious.

Approximate skeleton:

```tsx
function ElementModalityPies({ dist }: { dist: Distribution }) {
  const elementData = ELEMENTS.map(...).filter(d => d.count > 0);
  const modalityData = MODALITIES.map(...).filter(d => d.count > 0);
  const dominantElements = /* keys with max count */;
  const dominantModalities = /* keys with max count */;

  return (
    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
      <DonutBlock label="ELEMENTS" data={elementData} dominant={dominantElements} config={elementConfig} />
      <DonutBlock label="MODALITIES" data={modalityData} dominant={dominantModalities} config={modalityConfig} />
    </div>
  );
}
```

`DonutBlock` wraps `ChartContainer` + `PieChart` + `Pie` + `Label`, following the shadcn template verbatim aside from the custom stacked-center-text logic.

## Dependencies

- Install via `npx shadcn@latest add chart` inside `apps/web/`. This pulls in `recharts` and copies `src/components/ui/chart.tsx` into the project.
- No other package changes.

## Edge cases

- **No chart data** — the outer card already early-returns `null` when `chartData` is null; donuts inherit that.
- **Missing element / modality** — zero counts are filtered from the pie data so recharts does not render invisible slices.
- **All bodies share one element** (unlikely but possible) — donut renders as a single full ring, center label shows that one element.
- **Chiron missing from `zodiac_positions`** — already handled by the `if (!zp) continue` guard in the distribution helper; total stays at 11 but missing bodies are simply skipped (effective total = present bodies).

## Out of scope / explicit deferrals

- Accessibility polish beyond what shadcn's chart component provides by default.
- Animation tuning — recharts defaults are acceptable.
- Persisting the "dominant" as part of the chart data model — it is a presentational derivation only.

## File changes summary

1. `apps/web/package.json` — adds `recharts` (via shadcn add).
2. `apps/web/src/components/ui/chart.tsx` — new, created by shadcn add.
3. `apps/web/src/lib/astro-distribution.ts` — new, holds `SIGN_MODALITY` + `computeDistribution`.
4. `apps/web/src/components/chart/distribution-overlay.tsx` — replace local helper with import from `lib/astro-distribution`.
5. `apps/web/src/components/home/element-modality-card.tsx` — add `ElementModalityPies` sub-component, render below the existing grid, import from the shared helper.

## Verification

- `npm run typecheck --workspace=apps/web`
- `npm run build --workspace=apps/web`
- Dev server visual check: home page → Element × Modality card shows two donuts with correct counts, center text matches the grid's dominant cell, tied dominants stack vertically.
