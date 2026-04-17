# Astrology App — Design Document

## Overview

This document defines the complete visual design specification for the astrology application. It covers the design system, every screen, interaction patterns, and responsive behavior. Use it as the reference for generating screens in Google Stitch and as the specification for implementing them in Next.js + LiftKit.

**Design tool:** Google Stitch (stitch.withgoogle.com)
**UI framework:** Next.js + LiftKit (Chainlift)
**Visual direction:** Minimalist, modern, dark-mode-first
**Target platforms:** Web (primary), iOS and Android (later)

---

## Part 1: Design System

### 1.1 Color Palette

#### Dark Mode (Primary)

**Backgrounds:**
| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | #0A0E17 | Main app background |
| bg-secondary | #131926 | Cards, panels, sidebar |
| bg-tertiary | #1C2333 | Hover states, active areas |
| bg-input | #0F1420 | Input field backgrounds |

**Borders:**
| Token | Hex | Usage |
|-------|-----|-------|
| border-subtle | #2A3040 | Dividers, chart ring strokes |
| border-default | #353D4F | Input borders, card hover borders |

**Text:**
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | #E8ECF1 | Main body text |
| text-secondary | #8892A4 | Labels, captions, muted text |
| text-tertiary | #565E6C | Disabled, placeholder text |

**Accent:**
| Token | Hex | Usage |
|-------|-----|-------|
| accent-primary | #6C8EEF | Buttons, links, active states |
| accent-hover | #8BA5F5 | Button hover |
| accent-pressed | #5A7AD4 | Button pressed |
| accent-muted | #6C8EEF1A | Active nav background (10% opacity) |

**Status:**
| Token | Hex | Usage |
|-------|-----|-------|
| success | #4ADE80 | Confirmation, positive |
| warning | #FBBF24 | Caution, attention |
| error | #F87171 | Errors, destructive, retrograde |

#### Light Mode

| Dark Token | Light Equivalent | Hex |
|-----------|-----------------|-----|
| bg-primary | bg-surface | #FFFFFF |
| bg-secondary | bg-surface-alt | #F5F6F8 |
| bg-tertiary | bg-surface-hover | #ECEEF2 |
| border-subtle | border-light | #D0D5DD |
| text-primary | text-on-light | #1A1D24 |
| text-secondary | text-muted-light | #5A6275 |
| accent-primary | accent-light | #4A6FD4 |

#### Astrological Colors

**Zodiac elements:**
| Element | Hex | Signs | Background (8% opacity) |
|---------|-----|-------|------------------------|
| Fire | #E85D4A | Aries, Leo, Sagittarius | #E85D4A15 |
| Earth | #5BA858 | Taurus, Virgo, Capricorn | #5BA85815 |
| Air | #5B9FD4 | Gemini, Libra, Aquarius | #5B9FD415 |
| Water | #7B6DB5 | Cancer, Scorpio, Pisces | #7B6DB515 |

**Aspect lines:**
| Aspect | Hex | Nature |
|--------|-----|--------|
| Conjunction (0°) | #E8ECF1 | Neutral |
| Sextile (60°) | #5B9FD4 | Harmonious |
| Square (90°) | #E85D4A | Tension |
| Trine (120°) | #4A70E0 | Harmonious |
| Opposition (180°) | #E85D4A | Tension |
| Quincunx (150°) | #FBBF24 | Adjustment |
| Minor aspects | #565E6C | Subtle |

### 1.2 Typography

**Font:** Inter (Google Fonts)
**Fallback:** system-ui, -apple-system, sans-serif

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| text-xs | 11px | 16px | 400 | Chart labels, metadata |
| text-sm | 13px | 20px | 400 | Secondary text, captions |
| text-base | 15px | 24px | 400 | Body text |
| text-lg | 17px | 28px | 400 | Prominent body text |
| text-xl | 20px | 28px | 600 | Section headings |
| text-2xl | 24px | 32px | 600 | Page titles |
| text-3xl | 30px | 36px | 600 | Hero headings |

**Weights:** 400 (regular), 500 (medium), 600 (semibold)

### 1.3 Spacing

Use only these values — never arbitrary pixel amounts:

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Icon-to-text gap |
| space-2 | 8px | Compact spacing |
| space-3 | 12px | Standard internal padding |
| space-4 | 16px | Gap between components |
| space-6 | 24px | Card padding, section padding |
| space-8 | 32px | Gap between sections |
| space-12 | 48px | Major section separation |
| space-16 | 64px | Page-level vertical rhythm |

### 1.4 Layout Constants

| Property | Value |
|----------|-------|
| Max content width | 1200px |
| Sidebar collapsed width | 64px |
| Sidebar expanded width | 240px |
| Card border radius | 8px |
| Button border radius | 6px |
| Input border radius | 6px |
| Bottom tab bar height | 56px + safe area |

### 1.5 Breakpoints

| Name | Width | Sidebar | Chart Layout |
|------|-------|---------|-------------|
| Mobile | < 768px | Hidden (bottom tabs) | Stacked |
| Tablet | 768–1024px | Collapsed | Side-by-side (narrow panel) |
| Desktop | > 1024px | Collapsible | Side-by-side (full panel) |

---

## Part 2: Component Specifications

### 2.1 Buttons

**Primary:**
```
Background: #6C8EEF
Text: #FFFFFF, Inter 13px semibold
Padding: 8px 16px
Border radius: 6px
Hover: #8BA5F5
Active: #5A7AD4
Disabled: 50% opacity, no hover effect
```

**Secondary:**
```
Background: transparent
Border: 1px solid #6C8EEF
Text: #6C8EEF, Inter 13px semibold
Padding: 8px 16px
Hover: #6C8EEF0D background (5% accent)
```

**Ghost:**
```
Background: transparent
Text: #8892A4, Inter 13px medium
Padding: 8px 16px
Hover: #1C2333 background
```

**Danger:**
```
Background: #F87171
Text: #FFFFFF
Hover: #EF4444
```

**Sizes:** sm (py-4 px-12), md (py-8 px-16), lg (py-12 px-24)

### 2.2 Input Fields

```
Background: #0F1420
Border: 1px solid #2A3040
Text: #E8ECF1, Inter 15px regular
Placeholder: #565E6C
Padding: 8px 12px
Border radius: 6px
Focus: border changes to #6C8EEF
Error: border changes to #F87171, error message below in #F87171 text-sm
Label: #8892A4, Inter 13px medium, 4px below label
```

### 2.3 Cards

```
Background: #131926
Border radius: 8px
Padding: 24px
No visible border in dark mode
Light mode: 1px solid #D0D5DD
Hover (interactive cards): translateY(-2px), subtle shadow increase
```

### 2.4 Dropdown / Select

```
Trigger: same styling as input field, with chevron icon right-aligned
Dropdown panel: bg #131926, border 1px #2A3040, border-radius 8px
Option: padding 8px 12px, hover bg #1C2333
Selected option: text accent-primary, bg accent-muted
```

### 2.5 Toggle Switch

```
Track off: #2A3040, 40px wide, 22px tall, border-radius 11px
Track on: #6C8EEF
Thumb: #FFFFFF circle, 18px diameter, 2px inset
Transition: 150ms ease
```

### 2.6 Slider (for orb settings)

```
Track: #2A3040, 4px height, border-radius 2px
Filled track: #6C8EEF
Thumb: #FFFFFF circle, 16px, border 2px #6C8EEF
Value label: right of slider, text-sm, text-secondary
```

### 2.7 Badges / Tags

```
Retrograde badge: bg #F871711A, text #F87171, text-xs, px-6 py-2, border-radius 4px
Premium badge: bg #FBBF241A, text #FBBF24, text-xs, px-6 py-2, border-radius 4px
Element badge: bg element-color at 15%, text element-color, text-xs
```

### 2.8 Tooltip

```
Background: #1C2333
Text: #E8ECF1, text-xs
Padding: 4px 8px
Border radius: 4px
Arrow: 6px triangle pointing toward trigger
Delay: 300ms before showing
```

---

## Part 3: App Layout

### 3.1 Overall Structure

```
┌────────────┬────────────────────────────────────┐
│            │                                    │
│  SIDEBAR   │         MAIN CONTENT               │
│  64px or   │                                    │
│  240px     │         (scrollable)               │
│            │                                    │
│  fixed     │                                    │
│  full      │                                    │
│  height    │                                    │
│            │                                    │
└────────────┴────────────────────────────────────┘

Mobile:
┌────────────────────────────────────────────────┐
│                                                │
│              MAIN CONTENT                      │
│              (scrollable)                      │
│                                                │
├────────────────────────────────────────────────┤
│  ⌂    +    ☉    ↻    ⚙                        │
│ Home  New  Charts Trans. Settings              │
└────────────────────────────────────────────────┘
```

### 3.2 Sidebar — Collapsed (64px)

```
┌──────────┐
│    ☰→    │  Toggle button
├──────────┤
│          │
│    ⌂     │  Home
│          │
│    +     │  New Chart
│          │
│    ☉     │  My Charts
│          │
│    ↻     │  Transits
│          │
│          │
│  (flex)  │  Spacer
│          │
│          │
│    ⚙     │  Settings
│          │
│   [AV]   │  User avatar (32px)
│          │
└──────────┘

Specs:
  Background: bg-primary (#0A0E17)
  Border right: 1px border-subtle (#2A3040)
  Icon size: 20px
  Icon color: text-secondary (#8892A4)
  Active icon: accent-primary (#6C8EEF)
  Active bg: accent-muted (#6C8EEF1A), border-radius 8px, 40x40px
  Hover: icon transitions to text-primary (#E8ECF1)
  Item padding: centered in 64px width, 40px height per item
  Gap between items: 4px
  Tooltip: appears on hover, 300ms delay, shows label
```

### 3.3 Sidebar — Expanded (240px)

```
┌──────────────────────────┐
│  ←☰   Almagest           │  Toggle + app name
├──────────────────────────┤
│                          │
│  ⌂   Home                │
│                          │
│  +   New Chart           │
│                          │
│  ☉   My Charts           │
│                          │
│  ↻   Transits            │
│                          │
│                          │
│        (flex spacer)     │
│                          │
│                          │
│  ⚙   Settings            │
│                          │
│  [AV]  Evgeny            │
│        Free Plan  ↗      │
└──────────────────────────┘

Specs:
  App name: Inter 16px semibold, text-primary
  Labels: Inter 14px medium, text-secondary
  Active label: text-primary
  Active row: left border 2px accent-primary, bg accent-muted
  Icon-to-label gap: 12px
  Item padding: 8px 16px
  User section: 32px avatar circle + name + plan badge
  Plan badge: text-xs, text-secondary, "Free Plan" or "Premium"
  Upgrade arrow (↗): accent-primary, links to upgrade page

Transition:
  Width: 200ms ease-in-out
  Labels: fade in 150ms, delayed 50ms after expansion starts
  Toggle icon: rotates 180°
  Remembers state in localStorage
  Keyboard shortcut: Cmd+B / Ctrl+B
```

### 3.4 Bottom Tab Bar (Mobile)

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│    ⌂     │    +     │    ☉     │    ↻     │    ⚙     │
│   Home   │   New    │  Charts  │  Trans.  │  More    │
└──────────┴──────────┴──────────┴──────────┴──────────┘

Specs:
  Height: 56px + env(safe-area-inset-bottom) for iOS
  Background: bg-secondary (#131926)
  Top border: 1px border-subtle (#2A3040)
  Icon: 20px
  Label: text-xs (11px), 2px below icon
  Active: accent-primary (#6C8EEF) icon + label
  Inactive: text-tertiary (#565E6C)
  Tap target: 48px minimum per item
```

---

## Part 4: Screen Specifications

### 4.1 Home Screen

**Purpose:** Daily glance — what's happening in the sky right now.

**Stitch prompt:**
```
Design a dark-themed astrology app home screen for web desktop (1200px wide).
Background #0A0E17. Use Inter font. Sidebar on left (64px, collapsed, dark).
Main content has these sections as cards (bg #131926, border-radius 8px, padding 24px):

1. Hero card "Current Sky": left side shows a circular astrology chart wheel
   placeholder (280px diameter), right side lists 10 planet positions with
   glyphs and zodiac signs. Header says "Today" with current date right-aligned.

2. Moon card: compact single row showing moon phase icon, "Waxing Gibbous",
   current zodiac sign "Leo 22°15'", and a thin progress bar from New Moon to
   Full Moon with a dot marker.

3. "Today's Aspects" card: timeline showing 3-4 aspect events with times,
   planet glyphs, aspect symbols, and orb values. A horizontal timeline bar
   with colored dots at each event time.

4. "Retrograde Tracker" card: compact list showing 2 retrograde planets with
   red badges "℞ retrograde" and dates when they station direct.

5. "Your Transits" card: blurred/locked premium content with an "Unlock
   Personal Transits" button in accent blue (#6C8EEF).

Color accents: blue #6C8EEF, red #E85D4A, green #5BA858. Text primary #E8ECF1,
text secondary #8892A4. Cards have no visible border, differentiated by bg color.
Minimalist, professional, no decorative elements.
```

**Section specs:**

**Current Sky (hero):**
- Two-column layout within card: chart wheel (left ~45%), planet list (right ~55%)
- Chart wheel: 280px diameter, live-updating via approx-engine
- Planet list: compact table, columns: glyph (18px), name, sign glyph + degree
- Retrograde planets show ℞ in error color
- Click wheel → navigates to Transits page
- Header: "Today" text-2xl semibold left, date + time text-secondary right

**Moon:**
- Single card, ~80px height
- Moon phase icon (SVG, 32px): ○ ◐ ● ◑ etc.
- Phase name: text-base semibold
- Current sign + degree: text-base
- Next ingress: text-sm text-secondary ("enters Virgo tomorrow 06:14")
- Progress bar: 4px height, border-radius 2px, bg-tertiary track, accent-primary fill, white dot marker

**Today's Aspects:**
- Sorted chronologically by exactitude time
- Each row: time (text-sm, text-secondary), aspect notation (glyph + aspect glyph + glyph), description (text-base), orb (text-sm, text-secondary, right-aligned)
- Timeline bar: horizontal, 4px, marks at each aspect time, dot color = aspect color
- "Tomorrow" subheading for events after midnight
- Show aspects exact within 24 hours (orb < 1°)

**Retrograde Tracker:**
- Compact list, only currently retrograde planets
- Each: planet glyph + name, "℞ retrograde" badge (error-bg at 10%, error text), station direct date
- If no retrogrades: "All planets direct ✓" in success color

**Your Transits (premium):**
- Free: blurred content (CSS backdrop-filter blur 8px) with overlay
- Show 2-3 tantalizing lines visible through blur
- CTA button: "Unlock Personal Transits →" accent-primary
- Premium: shows top 5 transits to user's primary chart, sorted by tightness

**Mobile adaptation:**
- Chart wheel full-width (~300px centered), planet list below
- All cards stack vertically, 16px gap
- Moon card slightly more compact
- Timeline becomes vertical list

### 4.2 New Chart Screen

**Purpose:** Birth data input form.

**Stitch prompt:**
```
Design a dark-themed form page for creating an astrology chart.
Background #0A0E17, sidebar 64px on left. Main area centered.

A single card (bg #131926, border-radius 8px, padding 32px, max-width 480px)
centered in the main content area with heading "New Chart" (24px semibold).

Form fields (dark input style, bg #0F1420, border 1px #2A3040, text #E8ECF1):
  - Name (optional) — text input
  - Date of Birth — date picker input
  - Time of Birth — time picker with AM/PM selector
  - Birth Location — text input with search icon, shows lat/lon below when selected
  - House System — dropdown, default "Placidus"
  - Zodiac Type — dropdown, default "Tropical"
  - (conditional) Ayanamsa — dropdown, only shown when Sidereal selected

Submit button: "Calculate Chart", full width of form, bg #6C8EEF, white text.
Labels above each field in #8892A4, 13px. Generous vertical spacing (24px between fields).
Clean, minimal, no decorative elements.
```

**Field specs:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | text input | No | — | "My Chart", "John", event name, etc. |
| Date of Birth | date picker | Yes | — | Calendar dropdown, accepts manual typing |
| Time of Birth | time + AM/PM | Yes | — | 12-hour format with AM/PM toggle or 24-hour |
| Birth Location | autocomplete | Yes | — | Geocoding API (Google Places or similar) |
| House System | dropdown | No | Placidus | All 10 systems from API |
| Zodiac Type | dropdown | No | Tropical | Tropical / Sidereal |
| Ayanamsa | dropdown | Conditional | Lahiri | Only visible when Sidereal selected |

**Location field behavior:**
- Type to search: autocomplete dropdown appears after 3 characters
- Selecting a result fills the field and shows coordinates below: "51.9225°N, 4.4792°E"
- Coordinates shown in text-xs, text-tertiary

**Submit behavior:**
- Validate all required fields
- On submit: loading state (spinner in button), API call to astro-api
- On success: navigate to Chart Display screen with result
- On error: show error message below form

**Mobile:** Form fills full width with 16px padding, same field layout

### 4.3 Chart Display Screen

**Purpose:** The core screen — view and interact with a chart.

**Stitch prompt:**
```
Design a dark-themed astrology chart display page. Background #0A0E17,
sidebar 64px on left.

Top bar inside content area: back arrow, chart name "Evgeny — Nov 11, 1978,
07:00, Ekaterinburg", and action icons (settings gear, share, save) right-aligned.

Two-column layout:
Left column (60%): Large circular chart wheel placeholder (fills available width,
maintains square aspect ratio). Below the wheel: 3 tab buttons "Chart", "Transits",
"Aspects" — tab style, not card style.

Right column (40%): scrollable, contains 3 collapsible card sections:
1. "Planets" — table with columns: planet glyph, name, sign, degree, house number.
   About 12 rows. Retrograde planets have red "℞" marker.
2. "Aspects" — table: body1 glyph, aspect glyph, body2 glyph, orb value,
   "applying"/"separating" label. Aspect glyphs colored by type.
3. "Houses" — table: house number, sign, degree.

Colors: cards bg #131926, text primary #E8ECF1, text secondary #8892A4,
accent #6C8EEF. Tab active state: bottom border 2px #6C8EEF.
Minimal, professional, data-dense but clean.
```

**Layout specs:**

**Top bar:**
```
Height: 48px
Left: ← back button (ghost style), chart name + birth info (text-base)
Right: action icons (20px, text-secondary, hover text-primary)
  - ⚙ Settings (house system, zodiac — opens popover or modal)
  - ↗ Share (generates shareable URL)
  - 💾 Save (saves to user's charts, shows if not saved yet)
Border bottom: 1px border-subtle
```

**Left column (chart area):**
```
Chart wheel: rendered via chart-renderer on <canvas>
  Max width: fills column
  Aspect ratio: 1:1 (always square)
  Padding: 16px around wheel
  Background: matches theme background (rendered by chart-renderer)

Tabs below wheel:
  "Chart" — radix view (default)
  "Transits" — bi-wheel with current transits
  "Aspects" — alternative aspect grid/table view

Tab style:
  Inactive: text-secondary, no border
  Active: text-primary, bottom border 2px accent-primary
  Gap between tabs: 24px
  Padding: 8px 0 per tab
```

**Right column (data panels):**
```
Scrollable independently of left column (on desktop)
Gap between cards: 16px

Planet table columns:
  Glyph (18px) | Name (text-sm) | Sign glyph + degree (text-sm) | House (text-sm) | Dignity (text-xs, text-tertiary)
  Retrograde: ℞ badge in error color
  Rows: hover bg-tertiary
  Click row: could highlight planet on wheel (nice-to-have)

Aspect table columns:
  Body1 glyph | Aspect glyph (colored by type) | Body2 glyph | Orb (text-sm) | Applying/Separating (text-xs badge)
  Applying: success-colored badge
  Separating: text-tertiary badge
  Sorted by orb (tightest first)

House table columns:
  House number | Sign glyph + degree | Planets in house (text-xs, text-tertiary)

Each section: collapsible with chevron toggle, heading text-lg semibold
```

**Mobile adaptation:**
```
Single column, scrollable:
1. Top bar (same, sticky)
2. Chart wheel (full width, square)
3. Tabs (same, sticky below wheel)
4. Data panels (stacked cards, each collapsible)

Planet and aspect tables use horizontal scroll if needed
Or: simplified layout with fewer columns
```

### 4.4 My Charts Screen

**Purpose:** Browse and manage saved charts.

**Stitch prompt:**
```
Design a dark-themed chart library page. Background #0A0E17, sidebar 64px left.

Header: "My Charts" (24px semibold) with a "+ New Chart" button (bg #6C8EEF)
right-aligned.

Search bar below header (full width, bg #0F1420, border #2A3040, search icon,
placeholder "Search charts...").

Grid of chart cards (3 columns, gap 16px):
Each card (bg #131926, border-radius 8px, padding 16px):
  - Mini chart wheel thumbnail (circular, ~120px diameter) centered at top
  - Name below (text-base semibold): "Evgeny"
  - Sun sign with glyph (text-sm, text-secondary): "♏ Scorpio"
  - Date (text-xs, text-tertiary): "Nov 11, 1978"
  - Three-dot menu icon (⋯) in top-right corner

Below the grid: usage indicator for free tier:
"1 of 3 charts used" progress bar + "Upgrade to Premium →" link.

Minimal, clean, dark. Cards have subtle hover effect (lift).
```

**Grid specs:**
```
Desktop: 3 columns
Tablet: 2 columns
Mobile: 1 column (or 2 small cards)
Gap: 16px
Card min-width: 220px

Card hover: translateY(-2px), box-shadow increases
Card click: navigate to Chart Display

⋯ menu dropdown:
  - Edit name
  - Duplicate
  - Set as primary chart (for personal transits)
  - Delete (with confirmation dialog)
```

**Empty state (no charts yet):**
```
Centered content:
  Illustration or icon: subtle zodiac wheel outline (text-tertiary, 120px)
  "No charts yet" — text-xl, text-secondary
  "Create your first chart to get started" — text-base, text-tertiary
  [+ Create Chart] button — accent-primary
```

**Free tier limit:**
```
When at limit (3/3 charts):
  "+ New Chart" button becomes disabled
  Banner below grid: "You've reached the free plan limit. Upgrade for unlimited charts."
  [Upgrade to Premium →] button
```

### 4.5 Transits Screen

**Purpose:** Explore current and future transits.

**Stitch prompt:**
```
Design a dark-themed transits page for an astrology app. Background #0A0E17,
sidebar 64px left.

Header: "Transits" (24px semibold).

Main content:
Left side (60%): Bi-wheel chart (outer ring shows current transit planets,
inner ring shows natal chart). Above the wheel: a date selector showing
today's date with left/right arrow buttons and a "Today" reset button.

Right side (40%): transit list, cards showing:
  "Transit Saturn □ natal Moon — orb 0°34', applying"
  "Transit Jupiter △ natal Venus — orb 1°12', separating"
Each row has colored aspect glyphs and an orb indicator bar.

Below the chart: a horizontal timeline slider spanning 1 year,
with markers for significant transit events. Current date highlighted.

Dark, minimal, data-rich but clean layout.
```

**Date controls:**
```
[←] [March 29, 2026] [→] [Today]
Left/right arrows: move by 1 day (hold = accelerate)
Date text: clickable, opens date picker
"Today" button: resets to current date/time
While adjusting: approx-engine provides real-time positions
On stop: snap-to-server for precise calculation
```

**Timeline slider (premium):**
```
Spans 1 year centered on current date
Horizontal scrollable
Markers for: exact transit aspects, sign ingresses, retrogrades
Colored by significance
Drag to scrub through time (chart updates in real-time)
Free tier: today only
Premium: full timeline access
```

### 4.6 Settings Screen

**Stitch prompt:**
```
Design a dark-themed settings page. Background #0A0E17, sidebar 64px left.

Header: "Settings" (24px semibold).
Content: max-width 640px, left-aligned (not centered).

4 setting groups as cards (bg #131926, border-radius 8px, padding 24px):

1. "Defaults" card: dropdowns for default house system, default zodiac type,
   default ayanamsa (conditional on sidereal).

2. "Appearance" card: theme dropdown (Dark/Light/System), chart style dropdown.

3. "Aspects" card: toggle for "Show minor aspects", then a list of aspect
   types each with a slider for orb value (0-15 degrees) showing current value.

4. "Account" card: email display, plan badge (Free/Premium), upgrade button,
   sign out button (ghost/danger style).

Dark inputs, accent blue #6C8EEF, settings auto-save (no submit button).
```

**Auto-save behavior:**
```
Each setting change saves immediately
Show subtle "Saved ✓" toast notification (bottom-right, 2 seconds, fade out)
No explicit save/cancel buttons
Debounce slider changes (300ms)
```

---

## Part 5: Interaction Patterns

### 5.1 Page Transitions

```
Navigation between pages: instant (Next.js client-side routing)
Content area: subtle fade-in (150ms opacity 0→1)
No page-level loading spinners (use skeleton screens instead)
```

### 5.2 Loading States

```
Chart calculation: skeleton pulse animation where the wheel will appear
Planet list: skeleton rows (3 lines of varying width)
Cards: skeleton with pulse animation matching card dimensions
Never show blank white/dark screens — always show structure
```

### 5.3 Error States

```
API error: inline error card with error color left border
  "Could not calculate chart. Please check your input and try again."
  [Retry] button
Network error: top banner (bg error at 10%, text error)
  "You're offline. Chart calculations require an internet connection."
Form validation: inline below each field, text-sm error color
```

### 5.4 Empty States

```
No charts: illustration + message + CTA button (see My Charts spec)
No aspects for date: "No exact aspects today" with next aspect info
No transits: "No significant transits at this time"
Always provide context — never just show blank space
```

### 5.5 Confirmation Dialogs

```
Delete chart:
  Modal overlay (bg #0A0E17 at 60% opacity)
  Dialog card (bg-secondary, max-width 400px, centered)
  Title: "Delete chart?"
  Message: "This will permanently delete 'Evgeny'. This cannot be undone."
  Buttons: [Cancel (ghost)] [Delete (danger)]
```

### 5.6 Toast Notifications

```
Position: bottom-right, 16px from edges
Background: bg-secondary, border 1px border-subtle
Padding: 12px 16px
Border radius: 8px
Shadow: subtle dark shadow
Auto-dismiss: 3 seconds
Types:
  Success: left border 2px success color, ✓ icon
  Error: left border 2px error color, ✕ icon
  Info: left border 2px accent color, ℹ icon
```

---

## Part 6: Google Stitch Workflow

### 6.1 Approach

Stitch generates UI screens from text prompts. Use it to rapidly prototype each screen, then export the HTML/CSS as a reference for your Next.js + LiftKit implementation. Stitch output is a starting point — you'll refine in code.

### 6.2 Workflow

```
1. Write a Stitch prompt for each screen (prompts provided above)
2. Generate the screen in Stitch
3. Iterate with follow-up prompts:
   - "Make the background darker, use #0A0E17"
   - "Change all text to Inter font"
   - "Add more spacing between the cards"
   - "Make the sidebar narrower, 64px"
4. Export the HTML/CSS (Stitch outputs HTML + Tailwind)
5. Use the export as visual reference, NOT as production code
6. Implement in Next.js + LiftKit using LiftKit components
7. Match the visual result from Stitch
```

### 6.3 Stitch-Specific Tips

**Prompt structure that works well:**
- Start with overall layout description (background, sidebar, content area)
- Describe each section as a numbered list
- Include exact hex colors and pixel values
- Mention "dark-themed", "minimalist", "no decorative elements"
- Specify font: "Use Inter font family"
- End with overall mood: "Professional, data-rich but clean"

**Iteration prompts that help:**
- "Follow WCAG 2.1 contrast guidelines"
- "Increase the spacing between all sections to 32px"
- "Make all cards have consistent padding of 24px"
- "Remove all decorative borders, differentiate cards by background color only"
- "Align all content to an 8px grid"

**Limitations to expect:**
- Chart wheel: Stitch will generate a placeholder — the real wheel is your canvas renderer
- Astrological glyphs: Stitch won't have them — use Unicode symbols or placeholder text
- Responsive: generate desktop and mobile variants separately
- Dark mode precision: may need to adjust colors in follow-up prompts

### 6.4 Screen Generation Order

```
1. Home screen (desktop) — establishes the visual language
2. Home screen (mobile) — validates responsive approach
3. Chart Display (desktop) — the most complex layout
4. Chart Display (mobile) — critical for usability
5. New Chart form — simple, validates form styling
6. My Charts grid — validates card design
7. Settings — validates form controls (dropdowns, sliders, toggles)
8. Transits — validates bi-wheel and timeline controls
```

### 6.5 Export and Handoff

Stitch exports HTML + Tailwind CSS. For your Next.js + LiftKit implementation:

```
Stitch export → use as VISUAL REFERENCE only

Do NOT copy-paste Stitch code into your app. Instead:
1. Screenshot or keep the Stitch preview open
2. Build each screen in Next.js using LiftKit components
3. Match colors, spacing, and layout from the Stitch reference
4. LiftKit handles component styling — you focus on layout and composition
5. Chart wheel placeholder → replaced by your chart-renderer <canvas>
```

---

## Part 7: Responsive Design Details

### 7.1 Home Screen

| Element | Desktop (>1024) | Tablet (768-1024) | Mobile (<768) |
|---------|----------------|-------------------|---------------|
| Current Sky | Side-by-side (wheel + list) | Side-by-side (compact) | Stacked (wheel, then list) |
| Chart wheel | 280px | 220px | Full width, max 300px |
| Moon card | Full width, single row | Same | Same, slightly taller |
| Aspects | Horizontal timeline | Same | Vertical list |
| Cards gap | 24px | 16px | 16px |

### 7.2 Chart Display

| Element | Desktop (>1024) | Tablet (768-1024) | Mobile (<768) |
|---------|----------------|-------------------|---------------|
| Layout | 60/40 split | 55/45 split | Stacked |
| Chart wheel | ~500px max | ~400px | Full width |
| Data panels | Scrollable column | Same | Below wheel, collapsible |
| Tabs | Below wheel | Same | Horizontally scrollable |
| Top bar | Full info | Truncated name | Icon buttons only |

### 7.3 My Charts

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Grid columns | 3 | 2 | 1 |
| Card thumbnail | 120px wheel | 100px | 80px or full-width card |
| Search bar | Full width | Full width | Full width |

---

## Part 8: Accessibility

### 8.1 Contrast Requirements

All text must meet WCAG 2.1 AA contrast ratios:
- Normal text (< 18px): minimum 4.5:1 contrast ratio
- Large text (≥ 18px bold or ≥ 24px): minimum 3:1

Verified pairs:
| Foreground | Background | Ratio | Pass |
|-----------|-----------|-------|------|
| #E8ECF1 on #0A0E17 | — | 14.3:1 | ✓ |
| #8892A4 on #0A0E17 | — | 5.2:1 | ✓ |
| #8892A4 on #131926 | — | 4.1:1 | ✓ (large text only) |
| #565E6C on #0A0E17 | — | 3.1:1 | ✓ (large text only) |
| #FFFFFF on #6C8EEF | — | 3.8:1 | ✓ (large text / buttons) |

### 8.2 Keyboard Navigation

```
Tab order follows visual reading order (top→bottom, left→right)
Sidebar items: focusable, Enter to navigate
Form fields: standard tab order
Chart wheel: focusable, but interaction is mouse/touch only
All interactive elements have visible focus rings (2px accent-primary outline, 2px offset)
Esc: close dropdowns, modals, popovers
```

### 8.3 Screen Reader

```
Sidebar: <nav aria-label="Main navigation">
Chart wheel: <canvas> with aria-label describing the chart
  "Natal chart for Evgeny, born November 11 1978. Sun in Scorpio at 18 degrees."
Planet tables: proper <table> markup with headers
Aspect descriptions: "Sun square Moon, orb 2 degrees 34 minutes, applying"
```

---

## Part 4: Home Screen — Editorial Redesign (2026-04)

The Home screen (`/`) was redesigned in April 2026 from a handoff bundle produced in claude.ai/design. The intent is a "celestial journal" aesthetic: serif hero, quiet supporting cards, a single compositional hierarchy (hero + rail + detail + timeline) instead of a flat card grid.

### 4.1 Typography direction

- **Display face:** Instrument Serif — used for the page-head `h1`, hero-stat values, and moon-phase labels. Cormorant Garamond remains the fallback. The `--font-display` token resolves to `'Instrument Serif', 'Cormorant Garamond', Georgia, serif`.
- **UI face:** DM Sans, unchanged.
- **Numbers:** continue to use `tabular-nums` / monospace sparingly inside data tables.

### 4.2 Editorial conventions (new utility classes)

Defined in `apps/web/src/index.css` under `@layer base`:

- `.eyebrow` — section/context label above a headline.
  - 11px, weight 500, `letter-spacing: 0.14em`, `text-transform: uppercase`, color `var(--muted-foreground)`.
- `.card-title` — in-card section label (Positions, Aspects, Moon …).
  - 11px, weight 600, `letter-spacing: 0.1em`, `text-transform: uppercase`, color `var(--muted-foreground)`.

`.font-display` now also applies `letter-spacing: -0.01em` for tighter serif optics.

### 4.3 Home layout (desktop, ≥1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  FRIDAY, APRIL 17 · 20:59 · ROTTERDAM, NL         ← eyebrow  │
│  The sky today                                    ← h1 serif │
│  🌔 New Moon at 1° Taurus · 0 retrograde          ← meta     │
├──────────────────────────────────────────────────────────────┤
│ [SUN 27° aries] [ASC 1° scorpio] [♀→♊ in 6d] [☽ 1°52′ Tau] │ ← 4 hero stats
├──────────────────────────────────────────────────────────────┤
│                                       ┌────────────────────┐ │
│                                       │ Moon card          │ │
│        Chart wheel (1.3fr)            ├────────────────────┤ │
│        (square, full bleed)           │ Planetary hours    │ │
│                                       ├────────────────────┤ │
│                                       │ Retrograde tracker │ │
│                                       └────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [ Positions 1.1fr ] [ Aspects 1.4fr ] [ Element×Mode 1fr ]  │
├──────────────────────────────────────────────────────────────┤
│                Aspects Timeline (full width)                 │
└──────────────────────────────────────────────────────────────┘
```

- **Hero split:** chart-wheel column takes `flex: 1.3`, rail column `flex: 1`. Both columns align to top; the rail is allowed to be shorter than the square chart.
- **Stat row:** `grid-cols-2 lg:grid-cols-4`, `gap-gap`.
- **Detail row:** `grid-cols-1 lg:grid-cols-[1.1fr_1.4fr_1fr]`, `gap-gap`, `items-start`.
- **Spacing:** vertical rhythm is `gap-8` (32px) between major rows; `gap-gap` (16px, density-aware) inside rails/grids.

### 4.4 Page head composition

- Eyebrow: locale-formatted date + time + reverse-geocoded location name, joined by `·`. Uses the `.eyebrow` utility.
- `h1`: `font-display`, 44px / 1.05 leading. The last word is wrapped in `<em>` for italic emphasis (e.g. `The sky <em>today</em>`). Italic word uses `text-muted-foreground`.
- Meta line: one-line moon-phase summary and retrograde count, `text-sm text-muted-foreground`.

### 4.5 Hero-stat cards

Four cards of equal width. Each renders:

```
┌──────────────────────────┐
│ EYEBROW                  │ ← .card-title, 11px uppercase tracked
│                          │
│ Value                    │ ← font-display, 28px, truncate
│ (serif glyph + number)   │
│                          │
│ meta text                │ ← text-xs muted, truncate
└──────────────────────────┘
```

Component: `apps/web/src/components/home/hero-stat.tsx` — `<HeroStat eyebrow value meta tone?>`. `tone="accent"` recolors the value to `text-primary` (used for Next Ingress, which is conceptually a future event).

Current four-up slot assignment:

| Slot | Data source | Fallback |
|------|-------------|----------|
| Sun | `chartData.zodiac_positions[Sun]` | `—` until chart loads |
| Ascending | `chartData.houses.ascendant` → sign/deg (helper in `home.tsx`) | `—` |
| Next Ingress | Computed client-side from approx speeds for Mercury–Saturn; picks the soonest sign crossing within 60 days | `"No ingress in 60d"` |
| Moon | approx moon longitude + phase name + phase emoji | `—` |

Note: the original design showed `Next Eclipse` in slot 4. Eclipse data is not yet sourced from the backend or approx-engine; Moon fills the slot until that data becomes available.

### 4.6 Cards retained from pre-redesign

The following production cards are reused as-is in the new layout:

- `components/home/chart-wheel.tsx`
- `components/home/moon-card.tsx`
- `components/home/planetary-hours.tsx`
- `components/home/retrograde-tracker.tsx`
- `components/home/planet-card.tsx`
- `components/home/aspect-grid.tsx`
- `components/home/element-modality-card.tsx`
- `components/home/aspects-timeline.tsx`

They carry real data flow, dignity logic, collapsibles, skeletons, and tests. Visual polish of each individual card against the design bundle can be a follow-up pass.

### 4.7 Responsive behavior

- ≥1024px: full four-column stats, hero split, three-column detail as drawn.
- <1024px: stats collapse to `grid-cols-2`, detail row collapses to `grid-cols-1`, hero split falls back to the natural flex stack (chart first, rail second).
- The page is wrapped in `px-8 py-8` (32px all around) to match the design canvas.

### 4.8 Aspects Timeline — editorial bar style

The full-width "10-Day Aspects" card below the detail row uses a single SVG to stack one row per aspect. Each row carries:

- **Glyph trio label** (e.g. `♂△♄`) anchored just left of the bar's start — `text-anchor="end"`, 10px, muted colour. The middle (aspect) glyph is tinted with the aspect's own colour.
- **Thin line** from the first to the last sample where the aspect is active (`intensity > 0.05`). `stroke-width: 1.5`, `opacity: 0.38`, rounded caps.
- **Peak dot** (`r=3`, full opacity) at the sample with the highest intensity — this is what the header means by "peak marked."

Day grid runs the full height of the chart area:

- Vertical lines at every day boundary. Dashed (`stroke-dasharray: 2 4`, ~0.55 opacity) everywhere except the current day, which is solid (~0.9 opacity, 1.2px).
- **Today's slot is bounded by solid vertical lines on both edges** (day-start and day-end); every other day boundary is dashed.
- A `TODAY` label (monospace, 10px, `letter-spacing: 0.15em`, muted) is **centered inside the today slot** — between the two solid lines.
- A thin **NOW** marker (1px accent-coloured **dotted** vertical line at 0.5 opacity, `stroke-dasharray: 1 3`, no label) sits at the actual current moment. Computed from `(Date.now() - windowStart) / windowDuration`, independent of the sample grid, so it lands at the real position even between sample boundaries. Quiet enough to recede behind the bars but still discoverable.
- Day labels along the bottom in monospace (10px). `Apr 17` (today) uses the accent colour and `font-weight: 500`; other days use `var(--faint-foreground)`.
- **Reading the timeline:** peak dots to the *left* of NOW already happened; peak dots to the *right* are still coming. The solid today-bounds + centered TODAY label tell you which column is today at a glance; NOW tells you where the current moment sits inside it.

Implementation notes:

- Data is the existing `computeAspectBarsAsync` output — 40 samples per aspect (4/day × 10 days). The render derives `fromSample`, `toSample`, `peakSample` from each bar's `samples[]` array (active threshold 0.05).
- Aspects are filtered to the five majors (conjunction, opposition, trine, square, sextile) and the view is capped to the top 8 bars by peak intensity, then displayed left-to-right by peak time.
- Colours come from `ASPECT_COLORS` (the existing `--aspect-*` tokens: `--aspect-square`, `--aspect-trine`, `--aspect-conjunction`, …).
- SVG viewBox is `[-56, 0, 1056, H]` so glyph labels can hang into the left margin. `preserveAspectRatio="none"` lets the timeline stretch edge-to-edge inside the card.

### 4.9 Minor Aspects Timeline (second card)

Immediately below the major-aspects timeline, Home renders a second card with the same bar+dot layout for minor aspects. The component is the same `AspectsTimeline` parameterised with `variant="minor"`.

- **Title:** `.card-title` `10-Day Minor Aspects`.
- **Aspect set:** semi-sextile, semi-square, quincunx, sesquisquare, quintile, bi-quintile.
- **Compute:** forces `includeMinor: true` on the sampler regardless of the user's `aspects.showMinor` setting. The user setting only gates the major-card compute.
- **Palette:** borrows existing tokens so the minors read as a quieter echo of the majors — semi-square and sesquisquare use `--aspect-square`; quintile and bi-quintile use `--aspect-trine`; semi-sextile uses `--aspect-quincunx`.
- **Default max-orbs:** 2° for every minor aspect, overridable per-aspect via user settings.
- **Empty state:** when no minor aspect is active in the 10-day window, the card shows an inline "No active minor aspects in this 10-day window." message centred in the plot area.

Both cards share the same `MAX_BARS = 8` cap and the same "rank by peak intensity, then display in peak-time order" sort, so they feel like parts of the same visual family.

### 4.10 Editorial card header pattern

Every home card carries the same header strip at the top of its body:

```
┌──────────────────────────────────────────┐
│ CARD TITLE (uppercase, tracked)  chip ──►│
└──────────────────────────────────────────┘
```

- **Left:** the shared `.eyebrow` / `.card-title` utility — 11px, weight 600, `letter-spacing: 0.1em`, uppercase, colour `var(--muted-foreground)`.
- **Right:** a short contextual chip or inline meta. Two treatments:
  - **Chip** (pill): `inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground` — used when the meta feels categorical (day name, count-with-unit, state). Applied on Moon ("{X}% lit"), Planetary Hours ("{day}"), Retrogrades ("{N} active" / "none").
  - **Inline text** (no pill): plain `text-[11px] text-muted-foreground tabular-nums` — used when the meta is a pure count. Applied on Positions ("{n} bodies"), Aspects ("{n} hits").

Header sits on its own row `mb-3.5` (14px) above the card body; the body keeps its pre-existing layout. Header is always present, even in empty states, so the card reads as "named" at a glance.

### 4.11 Sidebar — brand mark & widths

- Expanded width `220px`, collapsed width `64px` (design bundle values; previously 144/89).
- A `26×26` rounded-square brand mark sits at the top-left: oklch gradient `linear-gradient(135deg, 62% 0.15 265 → 55% 0.18 305)` with a 1px inner highlight (`inset 0 0 0 1px oklch(100% 0 0 / 0.15)`). Content is a single italic `A` in `font-display` (Instrument Serif), 15px, white.
- The brand mark is **itself the toggle button** — clicking it collapses/expands. When expanded, an explicit `PanelLeftClose` icon button appears to the right of the wordmark; when collapsed the mark is the only affordance (plus `Cmd+B` and `double-click` fallbacks).
- Nav labels: `Today`, `New Chart`, `My Charts`, `Transits` (label changed from `Home` → `Today` to match the page-head headline).

### 4.12 Page head — right-side CTA

The editorial page head now carries a single primary action on its right:

- `<Button>+ New Chart</Button>` navigates to `/chart/new`. Rendered with a Lucide `Plus` icon prefixed, `gap-1.5`.
- No theme toggle (dark-mode-first; light switching is a future settings-page feature, not a header control).
- No "Tweaks" button — that was a design-tool iteration artifact, not production UX.

Page-head meta line now reads in three segments: `{moon-icon} {phase} at {deg}° {sign}` · `Day of {ruler}` · `{N} retrograde`. The day-ruler is derived from `new Date().getDay()` via the Chaldean week mapping `[Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn]`.

### 4.13 Positions table — column layout

Six columns in order: `glyph | name | sign-glyph | deg°min + ℞? | house | dignity-badge`. The name column was added in 2026-04 to match the design bundle's `PlanetTable` layout; values use short forms (`Sun / Moon / Mercury / … / Pluto / Chiron / N. Node / S. Node`) in `text-muted-foreground text-xs` so the glyph stays the visual anchor and the name adds readability without overpowering.

### 4.14 Element × Modality

Four-column CSS grid (`auto 1fr 1fr 1fr`) rendering a pill-per-cell matrix.

- **Column headers:** `Cardinal / Fixed / Mutable` — sentence case, 13px, `text-muted-foreground`, left-indented to line up with cell interior. No uppercase tracking — the `.card-title` already carries that weight at the card header.
- **Row labels:** `Fire / Earth / Air / Water` — 14px medium weight, coloured with the respective `--color-{element}` token, right-padded `pr-3`.
- **Cells:** `rounded-md min-h-[38px]` with a `1px var(--border)` outline in every state. Populated cells add a subtle fill via `background: color-mix(in oklch, var(--muted) 70%, transparent)`; empty cells are transparent at 55% opacity so they recede but the matrix shape still reads.
- **Glyphs:** coloured with the row's element colour, `letter-spacing: 0.08em` so a cell with multiple bodies (e.g. Fire × Cardinal with 4 planets on a New-Moon-in-Aries day) still breathes.

Responsiveness is handled by the 1fr columns — no container queries or viewport-unit font sizing is needed.

### 4.15 Token refinements (2026-04)

- **`--font-sans` = Inter** (DM Sans kept as a local-fallback second choice).
- **`--font-mono` = JetBrains Mono** (via `.mono` / `.font-mono` utility with `font-feature-settings: "tnum", "zero"`). Used for all tabular number readouts: degree/minute, sunrise/sunset, lat/lon, timeline day labels, house prefixes.
- **Neutral palette centered on hue 260–265 with very low chroma (0.002–0.008).** The design bundle's "lilac-leaning neutral" look. Previous blue-tinted neutrals (hue 220–255, chroma up to 0.03) were retuned to match.

**Complete neutral ladder:**

| Role | Token | Light | Dark |
|---|---|---|---|
| page bg | `--background` | `oklch(99% 0.002 260)` | `oklch(14% 0.003 265)` |
| elevated bg | `--bg-elev` | `oklch(97% 0.003 260)` | `oklch(17% 0.004 265)` |
| card surface | `--card` | `oklch(100% 0 0)` | `oklch(18% 0.004 265)` |
| card hover | `--card-hover` | `oklch(98% 0.002 260)` | `oklch(20% 0.005 265)` |
| border | `--border` | `oklch(92% 0.004 260)` | `oklch(25% 0.006 265)` |
| border-strong | `--border-strong` | `oklch(86% 0.006 260)` | `oklch(32% 0.008 265)` |

**Note on light-mode role:** `--card` is *pure white* and sits on a *slightly-off-white bg* — the card lifts off the page. Earlier drafts had these reversed (tinted card on white bg); design bundle specifies the former.

**Foreground ladder (four tiers):**

| Token | Light | Dark |
|---|---|---|
| `--foreground` | `oklch(18% 0.005 260)` | `oklch(96% 0.002 260)` |
| `--muted-foreground` | `oklch(42% 0.006 260)` | `oklch(70% 0.005 260)` |
| `--dim-foreground` | `oklch(58% 0.006 260)` | `oklch(50% 0.006 260)` |
| `--faint-foreground` | `oklch(72% 0.005 260)` | `oklch(36% 0.006 260)` |

`--faint-foreground` is used for dot separators in the page-head meta line and day-gridline labels on the timeline.

**Accent (primary) is mode-tuned:**
- Light: `oklch(52% 0.17 275)` — darker, more saturated so it holds weight on a bright bg.
- Dark: `oklch(65% 0.16 275)` — lighter so it pops off the charcoal surface.

**Element colours are dialed down.** `--color-fire/earth/air/water` use oklch (`68% 0.12 30` / `68% 0.09 140` / `78% 0.10 85` / `68% 0.10 235` in dark mode; equivalents at lower L for light). Elements harmonise with the neutral palette instead of overpowering it.

**Aspect palette uses the design's 3-group system:**

| Group | Role | Light | Dark | Aliases |
|---|---|---|---|---|
| `--aspect-harm` | harmonious (trine + sextile) | `oklch(55% 0.12 220)` | `oklch(68% 0.10 220)` | `--aspect-trine`, `--aspect-sextile` |
| `--aspect-hard` | tense (square + opposition) | `oklch(55% 0.15 25)` | `oklch(65% 0.13 25)` | `--aspect-square`, `--aspect-opposition` |
| `--aspect-conj` | conjunction | `oklch(50% 0.006 260)` | `oklch(65% 0.005 260)` | `--aspect-conjunction` |
| `--aspect-quincunx` | minor-awkward | `oklch(55% 0.11 300)` | `oklch(65% 0.11 300)` | — |

Per-aspect aliases (`--aspect-trine` etc.) resolve to the group tokens via `var()` so existing consumers keep working without a rename.

### 4.16 Moon card — final layout

```
┌───────────────────────────────────────────┐
│ MOON                              63% lit │  ← card header
├───────────────────────────────────────────┤
│  ◌   Waxing Gibbous              🌔       │
│     ♊ 14° 28' in Gemini                   │
│     ingress ~14h → Cancer                 │
├───────────────────────────────────────────┤
│ 1st Q   Apr 24 · 03:51          ♌ 3°32′  │
│ Full    May 1 · 18:37           ♏ 10°57′ │
│ 3rd Q   May 9 · 22:27           ♒ 18°51′ │
│ New     May 16 · 21:26          ♉ 25°34′ │
└───────────────────────────────────────────┘
```

Structure, top-to-bottom:
1. **Header:** `card-title "Moon"` + `{illumination}% lit` chip.
2. **Main row:** `MoonCycleRing 76px` (left) · serif phase name + sign position + ingress hint (middle, flex-1) · phase emoji (right, 24px).
3. **Separator.**
4. **Upcoming phases:** `grid-template-columns: 42px 1fr auto`, 4 rows. Column 1 label (muted), column 2 mono date · time (dim), column 3 element-coloured sign glyph + `deg°min`.

### 4.17 Planetary Hours — final layout

```
┌───────────────────────────────────────────┐
│ PLANETARY HOURS                   Friday  │  ← card header
├───────────────────────────────────────────┤
│ ☉   Hour of Sun                           │
│     until 22:22 · next ☿                  │
│ ─────────────█████████──────────────────  │  ← 4px progress
│ sunrise 06:42              sunset 20:42   │
└───────────────────────────────────────────┘
```

- **Main row:** `24px accent glyph` + `Hour of {Planet}` (14px medium) + mono `until {end} · next {nextGlyph}` (11.5px dim).
- **Progress bar:** 4px hairline (`h-1 bg-muted`), rounded ends, filled with `bg-primary` at `currentProgress * 100%`.
- **Bottom line:** mono `sunrise {time}` / `sunset {time}`, 11px dim, justified with `flex justify-between`.

### 4.18 Chart hero — HTML overlays

Chart canvas is rendered **without** a `chartInfo` prop so the pre-existing in-canvas corner labels are suppressed. Two HTML overlays sit absolutely-positioned on top of the card:

- **Top-left** (`absolute top-4 left-4`, `pointer-events-none`):
  - `card-title "Natal Sky · Now"`
  - mono location + `lat°N/S, lon°E/W` formatted via `formatLatLon()`.
- **Top-right** (`absolute top-4 right-4 flex gap-1.5`):
  - `{houseSystem}` chip (title-cased from user settings; `whole_sign` → `Whole Sign`).
  - `{zodiacType}` chip (title-cased; `tropical` → `Tropical`).
  - Both use the shared chip class.

### 4.19 Mobile breakpoint

Home now stacks at `md:` (768px) rather than the previous `lg:` (1024px). Specifically the 4-stat row goes from 4-col to 2-col, the chart + rail drops from side-by-side to stacked, and the 3-col detail row becomes single-column — all at the same breakpoint so the page degrades cleanly in one step. Design bundle targets 820px, so actual behaviour fires 52px sooner than design; acceptable given our Tailwind preset.

### 4.20 Card radius & border

`Card` component uses `rounded-[10px]` and `border border-border` — matches the design's 10px radius + 1px solid border exactly. The earlier `ring-1 ring-foreground/10` was softer but conflicted with the chart-card's outer `box-shadow` glow. Swap applies globally, so every card on every screen inherits the tighter look.

### 4.21 Spacing system — flat 16/18 grid with density axis

Retired the Fibonacci/φ scale (`--space-phi-1..7` → 5/8/13/21/34/55/89) in favour of the design bundle's three-token semantic system:

| Token | Default | Compact | Spacious | Purpose |
|---|---|---|---|---|
| `--gap` | `16px` | `10px` | `22px` | gaps between cards / inside grids |
| `--pad` | `18px` | `12px` | `24px` | card interior padding |
| `--pad-sm` | `12px` | `8px` | `16px` | tight card padding (Positions table) |
| `--radius` | `10px` | `8px` | `10px` | card corner radius |

Tokens are registered as Tailwind utilities via `--spacing-gap / --spacing-pad / --spacing-pad-sm`, producing the classes `gap-gap`, `p-pad`, `px-pad`, `p-pad-sm`, etc. Standard Tailwind numeric scale (`gap-2`, `gap-8`, `mt-3.5`, etc.) remains available for non-semantic spacing.

**Density axis:**

Setting `document.documentElement.dataset.density = "compact" | "balanced" | "spacious"` switches all three tokens site-wide — cards shrink/grow, grids retighten/breathe, nothing else needs to change. Default is balanced (no attribute set). This mirrors the design bundle's runtime tweak-panel; can be wired to a user setting later.

**Layout proportions (unchanged from design):**

| Location | Split |
|---|---|
| Stat row | `repeat(4, 1fr)` — four equal cards |
| Hero row (chart + rail) | `1.3fr` : `1fr` |
| Detail row (Positions/Aspects/Element×Modality) | `1.1fr` : `1.4fr` : `1fr` |
| Page outer padding | `32px` (`py-8 px-8`) |

The one vestige of the golden ratio is the `1.618:1` split still used on the Chart Viewer page (`/chart/:id`) — documented in that route's code comment, not a design token.

