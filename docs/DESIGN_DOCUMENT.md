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
