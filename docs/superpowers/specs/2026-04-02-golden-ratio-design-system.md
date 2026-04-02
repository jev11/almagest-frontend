# Golden Ratio Design System

**Goal:** Introduce golden ratio (φ = 1.618) proportions across the entire frontend — spacing, typography, layout columns, sidebar, and component dimensions — as a design system foundation with incremental rollout.

**Motivation:** The golden ratio has deep historical ties to astrology and sacred geometry, making it a natural thematic fit for an astrology platform. Beyond aesthetics, φ-based proportions create inherently harmonious visual rhythm.

---

## 1. Spacing Scale (Fibonacci)

Base 5px. Each step multiplies by φ (≈1.618), landing on Fibonacci numbers.

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| φ-1 | `--space-phi-1` | 5px | Icon-to-text gaps |
| φ-2 | `--space-phi-2` | 8px | Tight padding, inline gaps |
| φ-3 | `--space-phi-3` | 13px | Compact spacing, small card padding |
| φ-4 | `--space-phi-4` | 21px | Card padding, component gaps |
| φ-5 | `--space-phi-5` | 34px | Section gaps, column gaps |
| φ-6 | `--space-phi-6` | 55px | Page margins |
| φ-7 | `--space-phi-7` | 89px | Major section separation |

These are defined as CSS custom properties in `index.css` and exposed as Tailwind utility classes (e.g., `gap-phi-4`, `p-phi-3`).

**Replaces:** The current ad-hoc spacing scale (4, 8, 12, 16, 24, 32, 48px). Existing Tailwind spacing utilities (`gap-4`, `p-5`, etc.) are NOT removed — the φ tokens are additive and used in φ-redesigned components.

---

## 2. Typography Scale

Base 15px (matches current body size). Each major step multiplies by φ. Intermediate steps use √φ (≈1.272) for finer granularity.

| Token | CSS Variable | Size | Line Height | Usage |
|-------|-------------|------|-------------|-------|
| caption | `--text-caption` | 9px | 13px (×φ) | Chart labels, metadata |
| small | `--text-small` | 12px | 18px | Secondary text, captions |
| body | `--text-body` | 15px | 24px (×φ) | Default reading text |
| h3 | `--text-h3` | 19px | 28px | Card/widget headings |
| h2 | `--text-h2` | 24px | 34px (Fib) | Section headings |
| h1 | `--text-h1` | 39px | 55px (Fib) | Page titles |
| display | `--text-display` | 63px | 76px | Hero/splash text |

Line heights use Fibonacci numbers where possible (13, 18, 24, 28, 34, 55, 76).

**Font weights:** Unchanged — 400 for body, 500 for h3, 600 for h1/h2/display.

---

## 3. Layout Ratios

The golden ratio split: **61.8% / 38.2%** applied to major content divisions.

### Home Page (`routes/home.tsx`)

```
┌─────────────────────────────────────────────────┐
│  Header: "Today" + date                         │
├────────────────────────┬────────────────────────┤
│                        │                        │
│     Chart Wheel        │   MoonCard             │
│     + Aspect Grid      │   PlanetCard           │
│                        │   RetrogradeTracker     │
│     61.8% width        │   38.2% width          │
│                        │                        │
├────────────────────────┴────────────────────────┤
│  Aspects Timeline (full width)                  │
└─────────────────────────────────────────────────┘
```

- Column split: `flex: 1.618` (left) and `flex: 1` (right) — produces exact 61.8/38.2 ratio
- Column gap: `φ-5` (34px)
- Page horizontal padding: `φ-6` (55px)
- Page vertical padding: `φ-5` (34px)
- Card internal gap: `φ-4` (21px)
- Section gap (between top row and timeline): `φ-5` (34px)

**Chart wheel sizing:** Changes from `w-[60vw] h-[60vw]` to `width: 100%; aspect-ratio: 1` inside the 61.8% flex column. The chart fills its column width and maintains a square aspect ratio. On a 1200px content area, this produces a ~741px chart (1200 × 0.618).

### Chart View Page (`routes/chart-view.tsx`)

- Content / sidebar panel split: `flex: 1.618` / `flex: 1` (replaces fixed `w-[360px]`)
- The right panel becomes proportional instead of fixed-width
- On mobile (below `md` breakpoint): full-width stacked, no change

### Chart New Page (`routes/chart-new.tsx`)

- Form container max-width: 480px (unchanged — already close to Fibonacci-adjacent)
- Form padding: `φ-5` (34px) — replaces current p-8 (32px)
- Internal field gaps: `φ-4` (21px)

---

## 4. Sidebar

Fibonacci-based widths with φ ratio between collapsed and expanded states.

| State | Current | New |
|-------|---------|-----|
| Collapsed | 64px (`w-16`) | 89px (Fibonacci) |
| Expanded | 240px (`w-60`) | 144px (Fibonacci) |
| Ratio | 1:3.75 | 1:1.618 (φ) |

**Adjustments for narrower expanded width (144px):**
- Nav item font size: 13px (down from 14px)
- Nav item horizontal padding: `φ-2` (8px) instead of 16px
- "Almagest" title font size: 14px (down from 16px)
- User area text: condensed layout, name only (no "Free Plan" text at this width)
- Icon size: 20px (unchanged — fits in both states)

**Collapsed state (89px):**
- More room than current 64px — icons can be spaced more generously
- Icon button size: 34px × 34px (Fibonacci, up from 44px hit area reduced to visible area)
- Centered with `φ-4` (21px) horizontal margin on each side

---

## 5. Component Proportions

### Cards (all card-based widgets)
- Padding: `φ-4` (21px) — replaces current p-5 (20px)
- Border radius: `φ-2` (8px) — matches current `rounded-lg`
- Internal element gap: `φ-3` (13px)
- Header-to-content gap: `φ-3` (13px)

### Aspect Grid
- Label column: 24px (unchanged — not a spacing concern)
- Cell size: 28px (unchanged — grid needs to be compact)
- Grid wrapper margin adjustments use φ tokens

### Aspects Timeline
- Planet group gap: `φ-4` (21px)
- Row height: 34px (Fibonacci, down from 36px)
- Label column width: 70px (unchanged)

### Buttons
- Horizontal padding: `φ-3` (13px) for default size
- Height: 34px (Fibonacci) for default size
- Gap between icon and label: `φ-2` (8px)

---

## 6. CSS Custom Properties

All tokens defined in `apps/web/src/index.css` under the `:root` selector:

```css
:root {
  /* Golden ratio spacing */
  --space-phi-1: 5px;
  --space-phi-2: 8px;
  --space-phi-3: 13px;
  --space-phi-4: 21px;
  --space-phi-5: 34px;
  --space-phi-6: 55px;
  --space-phi-7: 89px;

  /* Golden ratio typography */
  --text-caption: 9px;
  --text-small: 12px;
  --text-body: 15px;
  --text-h3: 19px;
  --text-h2: 24px;
  --text-h1: 39px;
  --text-display: 63px;

  /* Layout ratios */
  --phi: 1.618;
  --phi-major: 61.8%;
  --phi-minor: 38.2%;

  /* Sidebar */
  --sidebar-collapsed: 89px;
  --sidebar-expanded: 144px;
}
```

Tailwind v4 utilities registered via `@theme inline` block in `index.css` to enable classes like `gap-phi-4`, `p-phi-3`, `text-phi-body`.

---

## 7. Implementation Phases

### Phase 1: Design Tokens
Define all CSS custom properties and Tailwind utilities. No visual changes. All existing pages continue to work.

**Files:** `apps/web/src/index.css`

### Phase 2: Home Page
Apply φ spacing, column ratios, and typography to the home page and its widgets.

**Files:** `routes/home.tsx`, `components/home/chart-wheel.tsx`, `components/home/moon-card.tsx`, `components/home/planet-card.tsx`, `components/home/retrograde-tracker.tsx`, `components/home/aspects-timeline.tsx`

### Phase 3: Chart View + Other Pages
Roll out φ layout to chart-view (proportional sidebar), chart-new (form spacing), charts list, transits, and settings pages.

**Files:** `routes/chart-view.tsx`, `routes/chart-new.tsx`, `routes/charts.tsx`, `routes/transits.tsx`, `routes/settings.tsx`

### Phase 4: Sidebar
Resize sidebar to 89px/144px with adjusted nav item sizing and spacing.

**Files:** `components/layout/sidebar.tsx`, `components/layout/app-layout.tsx`, `hooks/use-sidebar.ts`

Each phase is independently deployable and produces a working app.

---

## 8. What Stays the Same

- Color system (oklch-based dark/light themes) — unchanged
- Border radius base (8px = `φ-2`) — already aligned
- Icon sizes (20px Lucide) — unchanged
- Mobile breakpoint behavior — unchanged
- Chart renderer internals — unchanged (chart-renderer package is framework-agnostic)
- shadcn/ui component internals — only padding/gap adjustments on wrappers
