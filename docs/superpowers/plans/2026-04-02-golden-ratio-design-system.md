# Golden Ratio Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce golden ratio (φ = 1.618) proportions across the entire frontend — spacing, typography, layout, sidebar, and component dimensions — as a design system with incremental rollout.

**Architecture:** Define φ-based design tokens as CSS custom properties + Tailwind v4 utilities in `index.css`. Then apply them page by page: home, chart-view, chart-new, and finally the sidebar. Each phase produces a working app.

**Tech Stack:** Tailwind CSS v4 (CSS-first config), CSS custom properties, React, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/web/src/index.css` | Add φ spacing, typography, and layout CSS tokens + Tailwind utilities |
| Modify | `apps/web/src/routes/home.tsx` | Apply φ column ratio, spacing tokens |
| Modify | `apps/web/src/components/home/chart-wheel.tsx` | Replace `w-[60vw]` with flex-based sizing |
| Modify | `apps/web/src/components/home/moon-card.tsx` | Apply φ padding/gaps |
| Modify | `apps/web/src/components/home/planet-card.tsx` | Apply φ padding/gaps, remove fixed width |
| Modify | `apps/web/src/components/home/retrograde-tracker.tsx` | Apply φ padding/gaps |
| Modify | `apps/web/src/components/home/aspects-timeline.tsx` | Apply φ row height and gaps |
| Modify | `apps/web/src/routes/chart-view.tsx` | Replace fixed 360px panel with φ flex split |
| Modify | `apps/web/src/routes/chart-new.tsx` | Apply φ padding tokens |
| Modify | `apps/web/src/components/layout/sidebar.tsx` | Resize to 89px/144px, adjust nav items |
| Modify | `apps/web/src/hooks/use-sidebar.ts` | (no change needed — sidebar just uses CSS classes) |
| Modify | `AGENT_CHANGELOG.md` | Document decisions |

---

### Task 1: Define golden ratio design tokens

Add CSS custom properties and Tailwind v4 utilities for the entire φ-based design system. No visual changes — this is purely additive.

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Add φ tokens to `:root`**

In `apps/web/src/index.css`, add these custom properties inside the existing `:root` block, after the `--radius: 0.5rem;` line (line 28):

```css
  /* Golden ratio design system */
  --phi: 1.618;
  --phi-major: 61.8%;
  --phi-minor: 38.2%;

  /* Fibonacci spacing scale */
  --space-phi-1: 5px;
  --space-phi-2: 8px;
  --space-phi-3: 13px;
  --space-phi-4: 21px;
  --space-phi-5: 34px;
  --space-phi-6: 55px;
  --space-phi-7: 89px;

  /* Golden ratio typography */
  --text-phi-caption: 9px;
  --text-phi-small: 12px;
  --text-phi-body: 15px;
  --text-phi-h3: 19px;
  --text-phi-h2: 24px;
  --text-phi-h1: 39px;
  --text-phi-display: 63px;

  /* Sidebar */
  --sidebar-collapsed: 89px;
  --sidebar-expanded: 144px;
```

- [ ] **Step 2: Register Tailwind utilities in `@theme inline`**

In the existing `@theme inline` block (starts at line 99), add after the `--radius-xl` line (line 139):

```css
  /* Golden ratio spacing utilities */
  --spacing-phi-1: var(--space-phi-1);
  --spacing-phi-2: var(--space-phi-2);
  --spacing-phi-3: var(--space-phi-3);
  --spacing-phi-4: var(--space-phi-4);
  --spacing-phi-5: var(--space-phi-5);
  --spacing-phi-6: var(--space-phi-6);
  --spacing-phi-7: var(--space-phi-7);
```

This enables Tailwind classes: `gap-phi-4`, `p-phi-3`, `m-phi-5`, etc.

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds. No visual changes — tokens are defined but not yet used.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat: add golden ratio design tokens — Fibonacci spacing + φ typography"
```

---

### Task 2: Apply φ layout to the Home page

Replace arbitrary spacing and column ratios on the home page with golden ratio tokens. The left column gets `flex: 1.618`, the right column gets `flex: 1`.

**Files:**
- Modify: `apps/web/src/routes/home.tsx`
- Modify: `apps/web/src/components/home/chart-wheel.tsx`

- [ ] **Step 1: Update home.tsx layout**

Replace the entire return block in `apps/web/src/routes/home.tsx` (the `<div className="flex flex-col gap-6 py-8 px-12">` and everything inside) with:

```tsx
  return (
    <div className="flex flex-col gap-phi-5 py-phi-5 px-phi-6">
      {/* Header row */}
      <div className="flex items-baseline gap-phi-3">
        <h1 className="text-2xl font-semibold text-foreground">Today</h1>
        <span className="text-[15px] text-muted-foreground">{getDateDisplay()}</span>
      </div>

      {/* Top row: φ split — 61.8% left / 38.2% right */}
      <div className="flex gap-phi-5 items-start">
        <div className="flex flex-col gap-phi-4" style={{ flex: "1.618" }}>
          <ChartWheel sky={sky} />
          <AspectGrid sky={sky} />
        </div>
        <div className="flex flex-col gap-phi-4" style={{ flex: "1" }}>
          <MoonCard />
          <PlanetCard sky={sky} />
          <RetrogradeTracker />
        </div>
      </div>

      {/* Aspects Timeline — full-width below */}
      <AspectsTimeline />
    </div>
  );
```

Key changes:
- `gap-6` → `gap-phi-5` (34px)
- `py-8 px-12` → `py-phi-5 px-phi-6` (34px vertical, 55px horizontal)
- `gap-4` → `gap-phi-4` (21px)
- Left column: `style={{ flex: "1.618" }}`
- Right column: `style={{ flex: "1" }}`

- [ ] **Step 2: Update chart-wheel.tsx sizing**

In `apps/web/src/components/home/chart-wheel.tsx`, replace both instances of the `w-[60vw] h-[60vw]` class. The chart should fill its flex column width with a square aspect ratio.

Replace the skeleton container (line 14):
```tsx
      <div className="w-full aspect-square shrink-0 bg-card border border-border rounded-lg">
```

Replace the chart container (line 21-23):
```tsx
    <div
      className="w-full aspect-square shrink-0 rounded-lg overflow-hidden bg-card border border-border"
    >
```

Both instances: remove `w-[60vw] h-[60vw]`, use `w-full aspect-square` instead.

- [ ] **Step 3: Verify build and check visually**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

Run: `npm run dev --workspace=apps/web`
Verify: Home page shows 61.8/38.2 column split. Chart fills left column. Right column cards have more room than before.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/home.tsx apps/web/src/components/home/chart-wheel.tsx
git commit -m "feat: apply golden ratio layout to home page — φ column split + Fibonacci spacing"
```

---

### Task 3: Apply φ spacing to Home page widgets

Update the individual home page card components to use Fibonacci spacing tokens internally.

**Files:**
- Modify: `apps/web/src/components/home/moon-card.tsx`
- Modify: `apps/web/src/components/home/planet-card.tsx`
- Modify: `apps/web/src/components/home/retrograde-tracker.tsx`
- Modify: `apps/web/src/components/home/aspects-timeline.tsx`

- [ ] **Step 1: Update moon-card.tsx**

In `apps/web/src/components/home/moon-card.tsx`, replace the outer container class (line 50):

```tsx
    <div className="bg-card border border-border rounded-lg p-phi-4">
```

Replace the inner flex gap (line 51):
```tsx
        <div className="flex items-start gap-phi-3">
```

Replace the progress bar margin (line 67):
```tsx
      <div className="mt-phi-3">
```

Changes: `p-5` → `p-phi-4` (21px), `gap-4` → `gap-phi-3` (13px), `mt-4` → `mt-phi-3` (13px).

- [ ] **Step 2: Update planet-card.tsx**

Read `apps/web/src/components/home/planet-card.tsx` first to find the exact classes. Then:

Replace the outer container: remove the fixed `w-[220px]` and change padding to `p-phi-3`:
```tsx
    <div className="shrink-0 bg-card border border-border rounded-lg p-phi-3">
```

The card should now be fluid width (fills its flex column).

- [ ] **Step 3: Update retrograde-tracker.tsx**

In `apps/web/src/components/home/retrograde-tracker.tsx`, replace the outer container (line 51):
```tsx
    <div className="bg-card border border-border rounded-lg p-phi-4">
```

Replace the title margin (line 52):
```tsx
      <h3 className="text-foreground font-semibold text-sm mb-phi-3">Retrograde Tracker</h3>
```

Changes: `p-5` → `p-phi-4` (21px), `mb-3` → `mb-phi-3` (13px).

- [ ] **Step 4: Update aspects-timeline.tsx row height**

In `apps/web/src/components/home/aspects-timeline.tsx`, change the SVG row height from 36px to 34px (Fibonacci number).

Find `height="36"` in the BellCurve component (line 213) and change to:
```tsx
      height="34"
```

Find `style={{ height: "36px" }}` in the bar row (line 343) and change to:
```tsx
      style={{ height: "34px" }}
```

Update the outer container padding (line 316):
```tsx
    <div className="bg-card border border-border rounded-lg p-phi-4">
```

Update the title margin (line 317):
```tsx
      <h3 className="text-foreground font-semibold text-sm mb-phi-3">Aspects Timeline</h3>
```

Update the planet group gap (line 328):
```tsx
        <div className="flex flex-col gap-phi-4">
```

Also update the loading/empty state container padding to match:
```tsx
      <div className="bg-card border border-border rounded-lg p-phi-4">
        <h3 className="text-foreground font-semibold text-sm mb-phi-3">Aspects Timeline</h3>
```

Changes: `p-5` → `p-phi-4` (21px), `mb-3`/`mb-4` → `mb-phi-3` (13px), row height 36→34, `gap-4` → `gap-phi-4` (21px).

- [ ] **Step 5: Verify build**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/home/moon-card.tsx apps/web/src/components/home/planet-card.tsx apps/web/src/components/home/retrograde-tracker.tsx apps/web/src/components/home/aspects-timeline.tsx
git commit -m "feat: apply Fibonacci spacing to home page widgets"
```

---

### Task 4: Apply φ layout to Chart View page

Replace the fixed 360px right panel with a φ flex split. Apply Fibonacci spacing to internal elements.

**Files:**
- Modify: `apps/web/src/routes/chart-view.tsx`

- [ ] **Step 1: Update the main content split**

In `apps/web/src/routes/chart-view.tsx`, find the left column div (line 249):

```tsx
          <div className="flex flex-col flex-1 min-w-0 p-6 gap-4">
```

Replace with:

```tsx
          <div className="flex flex-col min-w-0 p-phi-4 gap-phi-3" style={{ flex: "1.618" }}>
```

Find the right column div (line 290):

```tsx
          <div className="w-full md:w-[360px] md:shrink-0 md:border-l border-t md:border-t-0 border-border flex flex-col gap-4 p-4 overflow-y-auto">
```

Replace with:

```tsx
          <div className="w-full md:border-l border-t md:border-t-0 border-border flex flex-col gap-phi-3 p-phi-3 overflow-y-auto" style={{ flex: "1" }}>
```

Key changes: Removes `md:w-[360px] md:shrink-0`, adds `style={{ flex: "1" }}`. The left column gets `flex: 1.618`. This creates a 61.8/38.2 split on desktop. Mobile stays full-width stacked.

- [ ] **Step 2: Update the loading skeleton to match**

Find the loading state (line 156-166) and update widths:

```tsx
    return (
      <div className="flex flex-col md:flex-row gap-phi-4 p-phi-4 h-full">
        <div className="flex items-center justify-center" style={{ flex: "1.618" }}>
          <ChartSkeleton />
        </div>
        <div className="flex flex-col gap-phi-3" style={{ flex: "1" }}>
          <TableSkeleton rows={11} />
          <TableSkeleton rows={6} />
          <TableSkeleton rows={12} />
        </div>
      </div>
    );
```

- [ ] **Step 3: Update tab gap and collapsible panel padding**

Find the tab row gap (line 261):
```tsx
            <div className="flex items-center gap-phi-5 shrink-0">
```

Find the collapsible panel `px-4 pb-4` (line 68):
```tsx
      {open && <div className="px-phi-3 pb-phi-3">{children}</div>}
```

Find the collapsible panel button padding (line 55-56):
```tsx
        className="w-full flex items-center gap-phi-2 px-phi-3 py-phi-2 text-left"
```

- [ ] **Step 4: Verify build**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/chart-view.tsx
git commit -m "feat: apply golden ratio layout to chart view — φ content/panel split"
```

---

### Task 5: Apply φ spacing to Chart New and remaining pages

Apply Fibonacci spacing to the form page and update padding on other route pages.

**Files:**
- Modify: `apps/web/src/routes/chart-new.tsx`

- [ ] **Step 1: Update chart-new.tsx**

Replace the entire return in `apps/web/src/routes/chart-new.tsx`:

```tsx
  return (
    <div className="flex items-center justify-center min-h-full py-phi-7 px-phi-4">
      <div className="w-full max-w-[480px]">
        <div className="bg-card border border-border rounded-lg p-phi-5">
          <h1 className="text-2xl font-semibold text-foreground mb-phi-4">New Chart</h1>
          <BirthDataForm />
        </div>
      </div>
    </div>
  );
```

Changes: `py-12 px-6` → `py-phi-7 px-phi-4` (89px/21px), `p-8` → `p-phi-5` (34px), `mb-6` → `mb-phi-4` (21px).

- [ ] **Step 2: Verify build**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/chart-new.tsx
git commit -m "feat: apply Fibonacci spacing to chart-new page"
```

---

### Task 6: Resize sidebar to Fibonacci proportions

Change the sidebar from 64px/240px to 89px/144px (consecutive Fibonacci numbers, ratio = φ). Adjust nav item sizing for the narrower expanded width.

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update sidebar widths**

In `apps/web/src/components/layout/sidebar.tsx`, find the `<aside>` className (line 95-98):

```tsx
        collapsed ? "w-16" : "w-60",
```

Replace with:

```tsx
        collapsed ? "w-[89px]" : "w-[144px]",
```

- [ ] **Step 2: Update NavButton sizing for new widths**

Find the NavButton className (lines 47-51):

```tsx
        collapsed
          ? "w-11 h-11 justify-center"
          : "w-full h-11 px-4 justify-start",
```

Replace with:

```tsx
        collapsed
          ? "w-[34px] h-[34px] justify-center"
          : "w-full h-[34px] px-phi-2 justify-start",
```

Changes: Button height from 44px (`h-11`) to 34px (Fibonacci). Expanded padding from 16px (`px-4`) to 8px (`px-phi-2`) — fits the 144px width.

Find the gap between icon and label (line 47):
```tsx
        "flex items-center gap-phi-2 rounded-lg text-sm transition-colors",
```

Change: `gap-3` → `gap-phi-2` (8px).

- [ ] **Step 3: Update header area**

Find the header div (lines 101-104):

```tsx
      <div
        className={cn(
          "flex items-center p-4 gap-3",
          collapsed ? "justify-center py-4 px-0" : "",
        )}
      >
```

Replace with:

```tsx
      <div
        className={cn(
          "flex items-center p-phi-2 gap-phi-2",
          collapsed ? "justify-center py-phi-2 px-0" : "",
        )}
      >
```

Find the title font size (line 108):
```tsx
          <span className="flex-1 font-semibold text-foreground text-[14px] leading-tight truncate">Almagest</span>
```

Change: `text-base` → `text-[14px]` + `truncate` to handle the narrower width.

- [ ] **Step 4: Update nav container padding**

Find both nav containers (lines 120 and 138):

```tsx
      <nav className={cn("flex flex-col gap-1 px-4", collapsed && "items-center px-0 mx-auto")}>
```

Replace both with:

```tsx
      <nav className={cn("flex flex-col gap-phi-1 px-phi-2", collapsed && "items-center px-0 mx-auto")}>
```

Changes: `gap-1` → `gap-phi-1` (5px), `px-4` → `px-phi-2` (8px).

- [ ] **Step 5: Update user area**

Find the user area (line 153):

```tsx
      <div className={cn("p-4 border-t border-border", collapsed && "flex justify-center px-0")}>
```

Replace with:

```tsx
      <div className={cn("p-phi-2 border-t border-border", collapsed && "flex justify-center px-0")}>
```

In the expanded user section, remove the "Free Plan" row to save space in the narrower 144px width. Replace the expanded user block (lines 158-170):

```tsx
          <div className="flex items-center gap-phi-2 py-1">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-semibold">E</span>
            </div>
            <span className="text-foreground text-sm font-medium leading-none truncate">Evgeny</span>
          </div>
```

- [ ] **Step 6: Update the toggle button padding**

Find the toggle button (line 110-112):

```tsx
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
```

Replace with:

```tsx
          className="p-phi-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
```

- [ ] **Step 7: Verify build and check visually**

Run: `npm run build --workspace=apps/web`
Expected: Build succeeds.

Run: `npm run dev --workspace=apps/web`
Verify:
- Collapsed sidebar is 89px — icons are centered with more room than before
- Expanded sidebar is 144px — nav labels fit, title shows, user name truncates if long
- Toggle animation is smooth
- Nav items are clickable (34px height is sufficient for touch)

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: resize sidebar to Fibonacci proportions — 89px/144px (φ ratio)"
```

---

### Task 7: Update AGENT_CHANGELOG.md

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add this entry at the top of `AGENT_CHANGELOG.md` (after the `# Agent Changelog` heading):

```markdown

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
```

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: add changelog entry for golden ratio design system"
```
