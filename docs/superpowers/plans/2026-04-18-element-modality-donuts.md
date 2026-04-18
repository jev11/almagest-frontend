# Element × Modality Donuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two donut charts — "Elements" and "Modalities" — beneath the existing Element × Modality grid on the home page, visualising the chart's dominant element/modality with a stacked-label center.

**Architecture:** Reuse the chart's existing distribution math by extracting `computeDistribution` + `SIGN_MODALITY` into a shared `lib/astro-distribution.ts` module. Render the donuts with shadcn's `Chart` component (thin wrapper over `recharts`). Drop the rendering logic as a private sub-component at the bottom of `element-modality-card.tsx`; the two donuts share a single `DonutBlock` helper. Center text uses `recharts`'s `<Label content>` slot with one `<tspan>` per tied dominant, vertically stacked around the center.

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind v4, shadcn/ui, recharts, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-18-element-modality-donuts-design.md`

---

## File Structure

**New files**

- `apps/web/src/lib/astro-distribution.ts` — shared `Modality` type, `SIGN_MODALITY` map, `computeDistribution(chartData, bodies)` helper, `dominantKeys(map)` helper.
- `apps/web/src/lib/astro-distribution.test.ts` — unit tests for `computeDistribution` and `dominantKeys`.
- `apps/web/src/components/ui/chart.tsx` — copied in by `shadcn add chart` (do not hand-edit).

**Modified files**

- `apps/web/package.json` / `apps/web/package-lock.json` — `recharts` added by `shadcn add chart`.
- `apps/web/src/components/chart/distribution-overlay.tsx` — drop local helper, import from the new shared module; zero behaviour change.
- `apps/web/src/components/home/element-modality-card.tsx` — add `ElementModalityPies` sub-component rendered under the grid; switch body-to-cell tallying over to the shared helper.

Two files stay intentionally thin: `element-modality-card.tsx` holds only the card markup + sub-components (no helper math), and the new `lib` module holds only the math + types (no React).

---

## Task 1: Extract shared distribution helper

**Goal:** Move `SIGN_MODALITY` and `computeDistribution` into a shared module with a pluggable body list, and add `dominantKeys` for the center-label logic.

**Files:**
- Create: `apps/web/src/lib/astro-distribution.ts`
- Create: `apps/web/src/lib/astro-distribution.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `apps/web/src/lib/astro-distribution.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CelestialBody, ZodiacSign, Element } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { SIGN_MODALITY, computeDistribution, dominantKeys } from "./astro-distribution";

function makeChart(
  positions: Partial<Record<CelestialBody, ZodiacSign>>,
): ChartData {
  const zodiac_positions = Object.fromEntries(
    Object.entries(positions).map(([body, sign]) => [
      body,
      { sign, degree: 0, longitude: 0 },
    ]),
  ) as ChartData["zodiac_positions"];
  return { zodiac_positions } as ChartData;
}

describe("SIGN_MODALITY", () => {
  it("maps the four cardinal signs to cardinal", () => {
    expect(SIGN_MODALITY[ZodiacSign.Aries]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Cancer]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Libra]).toBe("Cardinal");
    expect(SIGN_MODALITY[ZodiacSign.Capricorn]).toBe("Cardinal");
  });

  it("maps the four fixed signs to fixed", () => {
    expect(SIGN_MODALITY[ZodiacSign.Taurus]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Leo]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Scorpio]).toBe("Fixed");
    expect(SIGN_MODALITY[ZodiacSign.Aquarius]).toBe("Fixed");
  });

  it("maps the four mutable signs to mutable", () => {
    expect(SIGN_MODALITY[ZodiacSign.Gemini]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Virgo]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Sagittarius]).toBe("Mutable");
    expect(SIGN_MODALITY[ZodiacSign.Pisces]).toBe("Mutable");
  });
});

describe("computeDistribution", () => {
  it("tallies elements and modalities for the requested bodies", () => {
    const chart = makeChart({
      [CelestialBody.Sun]: ZodiacSign.Aries,     // Fire / Cardinal
      [CelestialBody.Moon]: ZodiacSign.Taurus,   // Earth / Fixed
      [CelestialBody.Mercury]: ZodiacSign.Leo,   // Fire / Fixed
    });

    const dist = computeDistribution(chart, [
      CelestialBody.Sun,
      CelestialBody.Moon,
      CelestialBody.Mercury,
    ]);

    expect(dist.total).toBe(3);
    expect(dist.elements.get(Element.Fire)).toBe(2);
    expect(dist.elements.get(Element.Earth)).toBe(1);
    expect(dist.modalities.get("Cardinal")).toBe(1);
    expect(dist.modalities.get("Fixed")).toBe(2);
  });

  it("skips bodies missing from zodiac_positions without lowering total", () => {
    const chart = makeChart({
      [CelestialBody.Sun]: ZodiacSign.Aries,
    });

    const dist = computeDistribution(chart, [
      CelestialBody.Sun,
      CelestialBody.Moon,
    ]);

    expect(dist.total).toBe(2);
    expect(dist.elements.get(Element.Fire)).toBe(1);
    expect(dist.elements.get(Element.Earth)).toBeUndefined();
  });
});

describe("dominantKeys", () => {
  it("returns the single key with the highest count", () => {
    const map = new Map<string, number>([
      ["a", 1],
      ["b", 3],
      ["c", 2],
    ]);
    expect(dominantKeys(map)).toEqual(["b"]);
  });

  it("returns every key tied for the highest count in insertion order", () => {
    const map = new Map<string, number>([
      ["a", 2],
      ["b", 3],
      ["c", 3],
    ]);
    expect(dominantKeys(map)).toEqual(["b", "c"]);
  });

  it("returns an empty array for an empty map", () => {
    expect(dominantKeys(new Map())).toEqual([]);
  });

  it("ignores zero-count entries", () => {
    const map = new Map<string, number>([
      ["a", 0],
      ["b", 0],
    ]);
    expect(dominantKeys(map)).toEqual([]);
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `npm run test --workspace=apps/web -- astro-distribution`

Expected: FAIL — `Cannot find module './astro-distribution'`.

- [ ] **Step 1.3: Write the implementation**

Create `apps/web/src/lib/astro-distribution.ts`:

```ts
import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";

export type Modality = "Cardinal" | "Fixed" | "Mutable";

export const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  [ZodiacSign.Aries]: "Cardinal",
  [ZodiacSign.Taurus]: "Fixed",
  [ZodiacSign.Gemini]: "Mutable",
  [ZodiacSign.Cancer]: "Cardinal",
  [ZodiacSign.Leo]: "Fixed",
  [ZodiacSign.Virgo]: "Mutable",
  [ZodiacSign.Libra]: "Cardinal",
  [ZodiacSign.Scorpio]: "Fixed",
  [ZodiacSign.Sagittarius]: "Mutable",
  [ZodiacSign.Capricorn]: "Cardinal",
  [ZodiacSign.Aquarius]: "Fixed",
  [ZodiacSign.Pisces]: "Mutable",
};

export interface Distribution {
  elements: Map<Element, number>;
  modalities: Map<Modality, number>;
  total: number;
}

export function computeDistribution(
  chartData: ChartData,
  bodies: readonly CelestialBody[],
): Distribution {
  const elements = new Map<Element, number>();
  const modalities = new Map<Modality, number>();

  for (const body of bodies) {
    const zp = chartData.zodiac_positions[body];
    if (!zp) continue;
    const el = SIGN_ELEMENT[zp.sign];
    const mod = SIGN_MODALITY[zp.sign];
    elements.set(el, (elements.get(el) ?? 0) + 1);
    modalities.set(mod, (modalities.get(mod) ?? 0) + 1);
  }

  return { elements, modalities, total: bodies.length };
}

export function dominantKeys<K>(counts: Map<K, number>): K[] {
  let max = 0;
  for (const n of counts.values()) if (n > max) max = n;
  if (max === 0) return [];
  const result: K[] = [];
  for (const [key, n] of counts) if (n === max) result.push(key);
  return result;
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npm run test --workspace=apps/web -- astro-distribution`

Expected: PASS (10 tests across the three `describe` blocks).

- [ ] **Step 1.5: Commit**

```bash
git add apps/web/src/lib/astro-distribution.ts apps/web/src/lib/astro-distribution.test.ts
git commit -m "Phase 3 Task: extract shared astro-distribution helper"
```

---

## Task 2: Switch `distribution-overlay.tsx` to the shared helper

**Goal:** Remove the duplicated local helper from `distribution-overlay.tsx` and import from `lib/astro-distribution` with zero behaviour change.

**Files:**
- Modify: `apps/web/src/components/chart/distribution-overlay.tsx`

- [ ] **Step 2.1: Replace the local helper with the shared import**

Open `apps/web/src/components/chart/distribution-overlay.tsx` and replace the top of the file (lines 1–63, everything up to and including the `function computeDistribution` definition) with:

```ts
import { useMemo } from "react";
import { CelestialBody, Element } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import {
  computeDistribution,
  type Modality,
} from "@/lib/astro-distribution";

const ELEMENT_LABELS: { key: Element; label: string; color: string }[] = [
  { key: Element.Fire, label: "Fire", color: "var(--color-fire)" },
  { key: Element.Earth, label: "Earth", color: "var(--color-earth)" },
  { key: Element.Air, label: "Air", color: "var(--color-air)" },
  { key: Element.Water, label: "Water", color: "var(--color-water)" },
];

const MODALITY_LABELS: { key: Modality; label: string; color: string }[] = [
  { key: "Cardinal", label: "Cardinal", color: "var(--color-fire)" },
  { key: "Fixed", label: "Fixed", color: "var(--primary)" },
  { key: "Mutable", label: "Mutable", color: "var(--color-air)" },
];

const COUNT_BODIES: CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];
```

Then in the component body, update the `useMemo` call from:

```tsx
const dist = useMemo(() => computeDistribution(chartData), [chartData]);
```

to:

```tsx
const dist = useMemo(
  () => computeDistribution(chartData, COUNT_BODIES),
  [chartData],
);
```

Leave the rest of the file (the two `<div>` overlays and their `.map` calls) unchanged.

- [ ] **Step 2.2: Type-check**

Run: `npm run typecheck --workspace=apps/web`

Expected: PASS with no errors.

- [ ] **Step 2.3: Run the full test suite to confirm nothing regressed**

Run: `npm run test --workspace=apps/web`

Expected: PASS across all test files.

- [ ] **Step 2.4: Commit**

```bash
git add apps/web/src/components/chart/distribution-overlay.tsx
git commit -m "Phase 3 Task: switch distribution-overlay to shared helper"
```

---

## Task 3: Install shadcn `chart` component

**Goal:** Pull in `recharts` and the shadcn `Chart` wrapper via the official generator.

**Files:**
- Create: `apps/web/src/components/ui/chart.tsx` (generated)
- Modify: `apps/web/package.json`, `apps/web/package-lock.json` (generated)

- [ ] **Step 3.1: Run the shadcn generator**

Run: `cd apps/web && npx shadcn@latest add chart --yes`

Expected: the command reports creating `src/components/ui/chart.tsx` and installs `recharts`. `apps/web/package.json` now lists `recharts` under `dependencies`.

- [ ] **Step 3.2: Verify the generated file exists and type-checks**

Run: `npm run typecheck --workspace=apps/web`

Expected: PASS. If type errors surface from `chart.tsx` due to a React 18 / recharts version skew, re-run with `--overwrite` — do not hand-patch the generated file.

- [ ] **Step 3.3: Build to confirm the Vite bundle accepts recharts**

Run: `npm run build --workspace=apps/web`

Expected: PASS. Build output should include a recharts chunk.

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/src/components/ui/chart.tsx apps/web/package.json apps/web/package-lock.json
git commit -m "Phase 3 Task: add shadcn chart component"
```

---

## Task 4: Add `ElementModalityPies` to the card

**Goal:** Render two donuts below the existing grid inside `element-modality-card.tsx`, using the shared distribution helper and shadcn `Chart` component, with stacked center labels on ties.

**Files:**
- Modify: `apps/web/src/components/home/element-modality-card.tsx`

- [ ] **Step 4.1: Replace the imports at the top of the file**

Open `apps/web/src/components/home/element-modality-card.tsx`. Replace lines 1–6 (all imports) with:

```tsx
import { Fragment, useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  SIGN_MODALITY,
  computeDistribution,
  dominantKeys,
  type Distribution,
  type Modality,
} from "@/lib/astro-distribution";
```

- [ ] **Step 4.2: Remove the duplicated local types and constants**

In the same file, delete the now-redundant local declarations:

- The `type Modality = "cardinal" | "fixed" | "mutable";` line.
- The entire local `SIGN_MODALITY` constant (all 12 entries).

Keep `DISPLAY_BODIES`, `ELEMENTS`, `MODALITIES`, and `ELEMENT_COLORS`.

**Adjust the existing modality lookups.** The local `SIGN_MODALITY` used lowercase values (`"cardinal"`, `"fixed"`, `"mutable"`), the shared one uses capitalised values (`"Cardinal"`, `"Fixed"`, `"Mutable"`). Update the `MODALITIES` constant to match:

```tsx
const MODALITIES: { key: Modality; label: string }[] = [
  { key: "Cardinal", label: "Cardinal" },
  { key: "Fixed", label: "Fixed" },
  { key: "Mutable", label: "Mutable" },
];
```

The grid's `grid.get(\`${element}|${modality}\`)` keys now compose from the capitalised modality value automatically — no further change needed in the grid loop.

- [ ] **Step 4.3: Add the modality color map and chart configs above the `Props` interface**

Insert these constants directly above `interface Props`:

```tsx
const MODALITY_COLORS: Record<Modality, string> = {
  Cardinal: "var(--primary)",
  Fixed: "color-mix(in oklch, var(--primary) 70%, var(--background))",
  Mutable: "color-mix(in oklch, var(--primary) 45%, var(--background))",
};

const elementChartConfig = {
  count: { label: "Bodies" },
  [Element.Fire]: { label: "Fire", color: "var(--color-fire)" },
  [Element.Earth]: { label: "Earth", color: "var(--color-earth)" },
  [Element.Air]: { label: "Air", color: "var(--color-air)" },
  [Element.Water]: { label: "Water", color: "var(--color-water)" },
} satisfies ChartConfig;

const modalityChartConfig = {
  count: { label: "Bodies" },
  Cardinal: { label: "Cardinal", color: MODALITY_COLORS.Cardinal },
  Fixed: { label: "Fixed", color: MODALITY_COLORS.Fixed },
  Mutable: { label: "Mutable", color: MODALITY_COLORS.Mutable },
} satisfies ChartConfig;
```

- [ ] **Step 4.4: Replace the component body so it computes distribution once and renders the pies**

Replace the entire `export function ElementModalityCard` function (the current `if (!chartData) return null;` down through the final `</Card>`) with:

```tsx
export function ElementModalityCard({ chartData }: Props) {
  const dist = useMemo<Distribution | null>(
    () => (chartData ? computeDistribution(chartData, DISPLAY_BODIES) : null),
    [chartData],
  );

  if (!chartData || !dist) return null;

  const grid = new Map<string, string[]>();
  for (const body of DISPLAY_BODIES) {
    const zp = chartData.zodiac_positions[body];
    if (!zp) continue;
    const element = SIGN_ELEMENT[zp.sign];
    const modality = SIGN_MODALITY[zp.sign];
    const key = `${element}|${modality}`;
    const list = grid.get(key) ?? [];
    list.push(PLANET_GLYPHS[body] ?? body);
    grid.set(key, list);
  }

  return (
    <Card className="card-hover py-0">
      <CardContent className="p-pad">
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="card-title">Element × Modality</div>
        </div>
        <div
          className="grid items-center gap-x-2 gap-y-2"
          style={{ gridTemplateColumns: "auto 1fr 1fr 1fr" }}
        >
          {/* Column headers */}
          <div />
          {MODALITIES.map((m) => (
            <div
              key={m.key}
              className="text-muted-foreground text-[11px] pl-1 pb-1"
              style={{ letterSpacing: "0.04em" }}
            >
              {m.label}
            </div>
          ))}

          {/* Rows */}
          {ELEMENTS.map((el) => (
            <Fragment key={el.key}>
              <div
                className="text-[12px] font-medium pr-3"
                style={{ color: ELEMENT_COLORS[el.key] }}
              >
                {el.label}
              </div>
              {MODALITIES.map((m) => {
                const glyphs = grid.get(`${el.key}|${m.key}`) ?? [];
                const hasGlyphs = glyphs.length > 0;
                return (
                  <div
                    key={m.key}
                    className="rounded-md min-h-[38px] flex items-center justify-center px-2 py-1 gap-1.5"
                    style={{
                      background: hasGlyphs ? "var(--bg-elev)" : "transparent",
                      border: "1px solid var(--border)",
                      opacity: hasGlyphs ? 1 : 0.55,
                    }}
                  >
                    {hasGlyphs && (
                      <span
                        className="text-[14px] leading-none"
                        style={{ color: ELEMENT_COLORS[el.key], letterSpacing: "0.12em" }}
                      >
                        {glyphs.join(" ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>

        <ElementModalityPies dist={dist} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4.5: Append `ElementModalityPies` and `DonutBlock` at the bottom of the file**

Add this below the `ElementModalityCard` function (still inside the same file):

```tsx
interface DonutSlice {
  key: string;
  label: string;
  count: number;
  fill: string;
}

function ElementModalityPies({ dist }: { dist: Distribution }) {
  const elementData: DonutSlice[] = ELEMENTS.map((el) => ({
    key: el.key,
    label: el.label,
    count: dist.elements.get(el.key) ?? 0,
    fill: ELEMENT_COLORS[el.key],
  })).filter((d) => d.count > 0);

  const modalityData: DonutSlice[] = MODALITIES.map((m) => ({
    key: m.key,
    label: m.label,
    count: dist.modalities.get(m.key) ?? 0,
    fill: MODALITY_COLORS[m.key],
  })).filter((d) => d.count > 0);

  const dominantElements = dominantKeys(dist.elements).map(
    (k) => ELEMENTS.find((e) => e.key === k)?.label ?? String(k),
  );
  const dominantModalities = dominantKeys(dist.modalities).map(
    (k) => MODALITIES.find((m) => m.key === k)?.label ?? String(k),
  );

  return (
    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
      <DonutBlock
        title="ELEMENTS"
        data={elementData}
        dominant={dominantElements}
        config={elementChartConfig}
      />
      <DonutBlock
        title="MODALITIES"
        data={modalityData}
        dominant={dominantModalities}
        config={modalityChartConfig}
      />
    </div>
  );
}

interface DonutBlockProps {
  title: string;
  data: DonutSlice[];
  dominant: string[];
  config: ChartConfig;
}

function DonutBlock({ title, data, dominant, config }: DonutBlockProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-muted-foreground text-[11px] pb-1"
        style={{ letterSpacing: "0.08em" }}
      >
        {title}
      </div>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-full max-w-[180px]"
      >
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="key"
            innerRadius={50}
            strokeWidth={2}
            label={({ value, x, y }) => (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white text-[11px] font-semibold"
              >
                {value}
              </text>
            )}
            labelLine={false}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                const cx = viewBox.cx ?? 0;
                const cy = viewBox.cy ?? 0;
                const n = dominant.length;
                if (n === 0) return null;
                const lineHeight = 16;
                const startY = cy - ((n - 1) * lineHeight) / 2;
                return (
                  <text textAnchor="middle" dominantBaseline="middle">
                    {dominant.map((label, i) => (
                      <tspan
                        key={label}
                        x={cx}
                        y={startY + i * lineHeight}
                        className="fill-foreground text-[13px] font-semibold"
                      >
                        {label}
                      </tspan>
                    ))}
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
```

- [ ] **Step 4.6: Type-check**

Run: `npm run typecheck --workspace=apps/web`

Expected: PASS. If you see `Property 'sign' does not exist on type 'ZodiacSign'` it means the `grid.get` keys are interpolating the numeric enum directly — double-check that the template string uses `${element}|${modality}` where both are values returned by the shared helper.

- [ ] **Step 4.7: Run the full test suite**

Run: `npm run test --workspace=apps/web`

Expected: PASS.

- [ ] **Step 4.8: Build to confirm the Vite bundle still builds**

Run: `npm run build --workspace=apps/web`

Expected: PASS.

- [ ] **Step 4.9: Visual check**

Run: `npm run dev --workspace=apps/web` (backend must be reachable at the configured `VITE_API_URL`). Open the home page in a browser and confirm:

1. The Element × Modality card shows the original grid unchanged.
2. Below the grid, two donuts appear side-by-side labelled "ELEMENTS" and "MODALITIES".
3. Each donut shows a numeric count on every slice (zero-count slices are absent entirely).
4. The centre of each donut shows the dominant category name; when two categories tie, they appear stacked vertically (one above centre, one below). Seed data that produces a tie if needed.
5. Element slice colors use `--color-fire/earth/air/water`; modality slices use three shades of `--primary`.

Stop the dev server (`Ctrl-C`) when finished.

- [ ] **Step 4.10: Commit**

```bash
git add apps/web/src/components/home/element-modality-card.tsx
git commit -m "Phase 3 Task: add dominant elements/modalities donuts"
```

---

## Task 5: Update changelog and checklist

**Goal:** Satisfy the project's per-task workflow (`CLAUDE.md` → Workflow section): update `AGENT_CHANGELOG.md` and tick `PHASE3_TASK_CHECKLIST.md`.

**Files:**
- Modify: `AGENT_CHANGELOG.md`
- Modify: `PHASE3_TASK_CHECKLIST.md`

- [ ] **Step 5.1: Read both files first**

Run: `cat AGENT_CHANGELOG.md PHASE3_TASK_CHECKLIST.md` to confirm the current format before editing.

- [ ] **Step 5.2: Append a changelog entry**

Add a new dated section at the top of `AGENT_CHANGELOG.md` matching the file's existing format, summarising:

- Extracted `computeDistribution` / `SIGN_MODALITY` into `lib/astro-distribution.ts` (plus `dominantKeys` helper), and pointed `distribution-overlay.tsx` at it.
- Added shadcn `chart` component (pulls in `recharts`).
- Added `ElementModalityPies` inside the Element × Modality card: two donuts (elements, modalities) with numeric slice counts and stacked dominant labels in the center. Modality palette uses three shades of `--primary`.
- Decision: body set for the donuts mirrors the grid above (11 bodies incl. Chiron) so the two visualisations cannot disagree; `distribution-overlay.tsx` kept its 10-body list to preserve the existing chart-canvas overlay.

- [ ] **Step 5.3: Tick the checklist**

Check the relevant task box(es) in `PHASE3_TASK_CHECKLIST.md`. If the checklist has no matching entry yet, append one under the appropriate phase heading describing "Dominant element / modality donuts on home card" and mark it complete.

- [ ] **Step 5.4: Commit**

```bash
git add AGENT_CHANGELOG.md PHASE3_TASK_CHECKLIST.md
git commit -m "Phase 3 Task: update changelog and checklist for donut charts"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the shared helper + tie detection. Task 2 covers the `distribution-overlay` migration. Task 3 covers the recharts dependency + shadcn chart component. Task 4 covers placement, colors, numeric slice labels, stacked ties, and 11-body parity with the grid. Task 5 covers the repo workflow obligations from `CLAUDE.md`.
- **No placeholders:** Every code block is complete; no "similar to above" or "TBD".
- **Type consistency:** Shared `Modality` is `"Cardinal" | "Fixed" | "Mutable"`. The card's `MODALITIES` array is updated to the capitalised keys in Task 4.2 so `grid.get` keys remain consistent across the old grid and the new pies. `Distribution` is the sole return type for `computeDistribution` and is imported in Task 4.1.
