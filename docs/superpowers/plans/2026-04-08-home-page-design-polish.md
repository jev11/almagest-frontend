# Home Page Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the home page from functional to visually distinctive through typography, atmospheric background, and card visual hierarchy.

**Architecture:** Three independent visual changes applied as CSS/markup modifications. Typography is a Google Fonts swap (display + body). Background atmosphere is a CSS-only dark-mode radial gradient + subtle noise texture. Card hierarchy differentiates the chart wheel (hero, borderless), moon card (accent border), and secondary cards (default).

**Tech Stack:** Google Fonts (Cormorant Garamond + DM Sans), CSS custom properties, Tailwind utilities

---

### Task 1: Typography — Replace Inter with Cormorant Garamond (display) + DM Sans (body)

**Files:**
- Modify: `apps/web/index.html` (Google Fonts link)
- Modify: `apps/web/src/index.css` (font-family variables)
- Modify: `apps/web/src/components/chart/distribution-overlay.tsx:69` (hardcoded Inter font)

**Why these fonts:**
- **Cormorant Garamond** — elegant serif with astrological gravitas, used for headings and display text
- **DM Sans** — clean geometric sans with more character than Inter, used for body/data

- [ ] **Step 1: Update Google Fonts link in index.html**

Replace the existing Inter font link:

```html
<!-- old -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap" rel="stylesheet" />

<!-- new -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garabald:ital,wght@0,400..700;1,400..700&family=DM+Sans:wght@300..700&display=swap" rel="stylesheet" />
```

Wait — the correct Google Fonts family name is `Cormorant+Garamond`. Fix:

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=DM+Sans:wght@300..700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Update CSS font variables in index.css**

In `apps/web/src/index.css`, inside the `@theme inline` block, change `--font-sans` and add `--font-display`:

```css
@theme inline {
  --font-sans: 'DM Sans', 'Noto Sans Symbols 2', 'Noto Sans Symbols', system-ui, -apple-system, sans-serif;
  --font-display: 'Cormorant Garamond', 'Georgia', serif;
  /* ... rest unchanged */
}
```

- [ ] **Step 3: Add a utility class for the display font**

In `apps/web/src/index.css`, inside the `@layer base` block, add:

```css
.font-display {
  font-family: var(--font-display);
}
```

- [ ] **Step 4: Update distribution overlay hardcoded font**

In `apps/web/src/components/chart/distribution-overlay.tsx`, line 69, change:

```typescript
// old
fontFamily: "Inter, system-ui, -apple-system, sans-serif",

// new
fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
```

- [ ] **Step 5: Apply display font to headings on the home page**

In `apps/web/src/routes/home.tsx`, update the header `<h1>`:

```tsx
// old
<h1 className="text-2xl font-semibold text-foreground">Today</h1>

// new
<h1 className="text-2xl font-semibold text-foreground font-display">Today</h1>
```

- [ ] **Step 6: Apply display font to card titles**

In `apps/web/src/components/home/retrograde-tracker.tsx`, update the `<h3>`:

```tsx
// old
<h3 className="text-foreground font-semibold text-sm mb-phi-3">Retrograde Tracker</h3>

// new
<h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">Retrograde Tracker</h3>
```

In `apps/web/src/components/home/aspects-timeline.tsx`, update both `<h3>` elements (line 369 and line 381):

```tsx
// old
<h3 className="text-foreground font-semibold text-sm mb-phi-3">Aspects Timeline</h3>

// new
<h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">Aspects Timeline</h3>
```

In `apps/web/src/components/home/moon-card.tsx`, update the phase name `<p>`:

```tsx
// old
<p className="text-foreground font-semibold text-base">{phaseName}</p>

// new
<p className="text-foreground font-semibold text-base font-display">{phaseName}</p>
```

- [ ] **Step 7: Apply display font to sidebar brand name**

In `apps/web/src/components/layout/sidebar.tsx`, update the brand span:

```tsx
// old
<span className="flex-1 font-semibold text-foreground text-[14px] leading-tight truncate">Almagest</span>

// new
<span className="flex-1 font-semibold text-foreground text-[14px] leading-tight truncate font-display">Almagest</span>
```

- [ ] **Step 8: Verify dev server renders the new fonts**

Run: `npm run dev --workspace=apps/web`

Open browser, check:
- "Today" heading uses Cormorant Garamond (serif)
- Planet table data uses DM Sans (geometric sans)
- Card titles (Retrograde Tracker, Aspects Timeline) use Cormorant Garamond
- "Almagest" in sidebar uses Cormorant Garamond

- [ ] **Step 9: Commit**

```bash
git add apps/web/index.html apps/web/src/index.css apps/web/src/routes/home.tsx apps/web/src/components/home/retrograde-tracker.tsx apps/web/src/components/home/aspects-timeline.tsx apps/web/src/components/home/moon-card.tsx apps/web/src/components/layout/sidebar.tsx apps/web/src/components/chart/distribution-overlay.tsx
git commit -m "phase3: typography upgrade — Cormorant Garamond display + DM Sans body"
```

---

### Task 2: Background Atmosphere — Dark-mode radial gradient + subtle noise

**Files:**
- Modify: `apps/web/src/index.css` (add background gradient and noise)

**Approach:** Use a CSS radial gradient centered on the page that creates a subtle "cosmic glow" in dark mode. Layer a very low-opacity noise texture on top using a tiny inline SVG data URI. Light mode stays clean white.

- [ ] **Step 1: Add atmospheric background styles to index.css**

In `apps/web/src/index.css`, inside the `@layer base` block, update the `body` rule:

```css
body {
  @apply bg-background text-foreground font-sans;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Add a new rule below it for the dark mode atmosphere:

```css
.dark body {
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, oklch(14% 0.04 265 / 0.6), transparent 70%),
    radial-gradient(ellipse 50% 40% at 80% 100%, oklch(12% 0.03 300 / 0.3), transparent 60%),
    var(--background);
}

.dark body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}
```

- [ ] **Step 2: Ensure body content sits above the noise layer**

In `apps/web/src/index.css`, add to the `body` rule:

```css
body {
  @apply bg-background text-foreground font-sans;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
  z-index: 0;
}
```

And ensure `#root` sits above the pseudo-element by adding:

```css
#root {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 3: Verify in dark mode**

Run the dev server. In dark mode:
- A subtle blue-ish glow should appear at the top-center of the page
- A very faint purple glow at the bottom-right
- A barely-visible noise texture across the entire page
- In light mode, none of this should appear

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "phase3: atmospheric dark-mode background with radial gradients and noise texture"
```

---

### Task 3: Card Visual Hierarchy — Differentiate chart wheel, moon card, and secondary cards

**Files:**
- Modify: `apps/web/src/components/home/chart-wheel.tsx` (remove border, add radial glow)
- Modify: `apps/web/src/components/home/moon-card.tsx` (gradient accent border)
- Modify: `apps/web/src/routes/home.tsx` (staggered entry animation classes)
- Modify: `apps/web/src/index.css` (card animation keyframes, moon-card border utility)

- [ ] **Step 1: Make the chart wheel borderless with radial glow**

In `apps/web/src/components/home/chart-wheel.tsx`, update the main container div:

```tsx
// old — skeleton
<div className="w-full aspect-square bg-card border border-border rounded-lg">

// new — skeleton
<div className="w-full aspect-square bg-card rounded-lg">
```

```tsx
// old — rendered
<div
  className="relative w-full aspect-square rounded-lg overflow-hidden bg-card border border-border"
  style={{ containerType: "inline-size" }}
>

// new — rendered (remove border, add subtle radial glow via box-shadow)
<div
  className="relative w-full aspect-square rounded-lg overflow-hidden bg-card shadow-[0_0_80px_-20px_var(--primary)/0.15]"
  style={{ containerType: "inline-size" }}
>
```

Note: The shadow uses the primary color at 15% opacity to create a subtle glow effect around the chart.

- [ ] **Step 2: Add gradient accent border to the moon card**

In `apps/web/src/index.css`, add a utility class for the moon card's gradient border. Add this after the `.orb-slider` rules:

```css
.card-moon {
  position: relative;
  border: none;
  background: var(--card);
  border-radius: var(--radius);
}

.card-moon::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, oklch(62% 0.15 265 / 0.5), oklch(62% 0.10 300 / 0.2), transparent 60%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

In `apps/web/src/components/home/moon-card.tsx`, update the wrapper div:

```tsx
// old
<div className="bg-card border border-border rounded-lg p-phi-4">

// new
<div className="card-moon p-phi-4">
```

- [ ] **Step 3: Add staggered fade-in animation**

In `apps/web/src/index.css`, add keyframes and utility classes:

```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeSlideUp 0.4s ease-out both;
}
```

- [ ] **Step 4: Apply staggered animations to home page sections**

In `apps/web/src/routes/home.tsx`, add animation classes with staggered delays:

```tsx
// Header row
<div className="flex items-baseline gap-phi-3 animate-fade-in">

// Left column (chart + aspect grid)
<div className="flex flex-col gap-phi-4 min-w-0 animate-fade-in" style={{ flex: "1.618", animationDelay: "0.05s" }}>

// Right column (moon, planets, retrograde, element-modality)
<div className="flex flex-col gap-phi-4 animate-fade-in" style={{ flex: "1", animationDelay: "0.1s" }}>

// Aspects Timeline
<AspectsTimeline /> — wrap in a div:
<div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
  <AspectsTimeline />
</div>
```

- [ ] **Step 5: Add subtle hover lift to all cards**

In `apps/web/src/index.css`, add a generic card hover transition:

```css
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px -4px oklch(0% 0 0 / 0.15);
}

.dark .card-hover:hover {
  box-shadow: 0 4px 20px -4px oklch(62% 0.15 265 / 0.1);
}
```

Apply `card-hover` to the secondary cards:

In `apps/web/src/components/home/planet-card.tsx`:
```tsx
// old
<div className="bg-card border border-border rounded-lg p-phi-3">

// new
<div className="bg-card border border-border rounded-lg p-phi-3 card-hover">
```

In `apps/web/src/components/home/retrograde-tracker.tsx`:
```tsx
// old
<div className="bg-card border border-border rounded-lg p-phi-4">

// new
<div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
```

In `apps/web/src/components/home/element-modality-card.tsx`:
```tsx
// old
<div
  className="bg-card border border-border rounded-lg p-phi-4"
  style={{ containerType: "inline-size" }}
>

// new
<div
  className="bg-card border border-border rounded-lg p-phi-4 card-hover"
  style={{ containerType: "inline-size" }}
>
```

In `apps/web/src/components/home/aspects-timeline.tsx` (both loading and rendered states):
```tsx
// old (loading)
<div className="bg-card border border-border rounded-lg p-phi-4">

// new (loading)
<div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
```

In `apps/web/src/components/home/moon-card.tsx`, also add `card-hover`:
```tsx
// new
<div className="card-moon p-phi-4 card-hover">
```

- [ ] **Step 6: Verify the visual hierarchy**

Run the dev server and check:
- Chart wheel: no border, subtle blue glow around it — clearly the hero element
- Moon card: gradient border (blue → purple fade), visually elevated
- Other cards: standard border, subtle lift on hover
- All sections fade in with stagger on page load

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/index.css apps/web/src/components/home/chart-wheel.tsx apps/web/src/components/home/moon-card.tsx apps/web/src/routes/home.tsx apps/web/src/components/home/planet-card.tsx apps/web/src/components/home/retrograde-tracker.tsx apps/web/src/components/home/element-modality-card.tsx apps/web/src/components/home/aspects-timeline.tsx
git commit -m "phase3: card visual hierarchy — hero glow, gradient moon border, fade-in animations"
```

---

### Task 4: Update AGENT_CHANGELOG.md

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add at the top of the file, below the `# Agent Changelog` heading:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "phase3: update changelog with design polish decisions"
```
