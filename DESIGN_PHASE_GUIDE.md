# Design Phase Guide — Astrology Software

## Overview

This document guides you through designing the visual identity and UI for the astrology app. It's written for a developer with no prior design experience, using Pencil.dev as the design tool alongside Claude Code.

The design work happens in a focused sprint between Phase 1 (backend) and Phase 2 (chart renderer), with a follow-up pass before Phase 3 (web app).

## Timeline

```
Phase 1 complete
    │
    ▼
Week 5, Days 1-2:  Design System (colors, type, tokens)
Week 5, Days 3-4:  Chart Wheel Design (the core visual)
Week 5, Day 5:     Key Screen Wireframes (3 screens)
    │
    ▼
Phase 2 starts (chart renderer implementation)
    │
    ...
    │
    ▼
Before Phase 3:    Remaining screen designs (2 days)
```

---

## Part 1: Design Fundamentals (Crash Course)

Before opening Pencil, internalize these principles. They're all you need to make something that looks professional.

### The 4 Rules of Clean Design

**1. Spacing is everything.**
Use a consistent spacing scale based on multiples of 4px: 4, 8, 12, 16, 24, 32, 48, 64. Never eyeball spacing. If two elements need space between them, pick a value from this scale. Generous whitespace makes everything look more premium.

**2. Limit your choices.**
- 2 fonts maximum (1 heading, 1 body — or just 1 for everything)
- 3-5 colors maximum in your core palette
- 2-3 font sizes for body text (small, regular, large)
- 1 border radius value used consistently (0px for sharp, 6px for subtle, 12px for rounded)

**3. Hierarchy through contrast, not decoration.**
Make important things bigger, bolder, or higher-contrast. Make secondary things smaller, lighter, or lower-contrast. Never add visual elements (borders, shadows, backgrounds) unless they serve a purpose. When in doubt, remove things.

**4. Alignment creates order.**
Everything should align to an invisible grid. Left edges line up. Spacing between groups is consistent. Nothing floats randomly. Use Pencil's alignment guides.

### Design Vocabulary You'll Need

| Term | What it means |
|------|---------------|
| **Typography scale** | A set of predefined font sizes (e.g., 12, 14, 16, 20, 24, 32px) |
| **Color token** | A named color variable (e.g., `primary-500`, `surface-dark`) |
| **Spacing token** | A named spacing value (e.g., `space-sm` = 8px, `space-md` = 16px) |
| **Component** | A reusable UI piece (button, card, input field) |
| **Elevation** | Visual depth created by shadow (higher = more prominent) |
| **Opacity** | Transparency level (1.0 = solid, 0.5 = half transparent) |

---

## Part 2: Design System

Create a file called `design-system.pen` in your astro-app repo. This is your source of truth.

### 2.1 Color Palette

For a minimalist astrology app, start with a neutral base and add meaning through accent colors.

**Core colors (define as Pencil variables):**

```
Background:
  bg-primary:     #0A0E17     (very dark navy — main background, dark mode)
  bg-secondary:   #131926     (slightly lighter — cards, panels)
  bg-tertiary:    #1C2333     (lighter still — hover states, active areas)
  bg-surface:     #FFFFFF     (light mode background)
  bg-surface-alt: #F5F6F8     (light mode cards)

Text:
  text-primary:   #E8ECF1     (main text on dark)
  text-secondary: #8892A4     (muted text, labels)
  text-tertiary:  #565E6C     (disabled, placeholder)
  text-on-light:  #1A1D24     (main text on light bg)

Accent:
  accent-primary: #6C8EEF     (soft blue — primary actions, links)
  accent-hover:   #8BA5F5     (lighter blue — hover state)
  accent-muted:   #6C8EEF1A   (blue at 10% opacity — subtle highlights)

Status:
  success:        #4ADE80     (green — confirmation)
  warning:        #FBBF24     (amber — caution)
  error:          #F87171     (red — errors)
```

**Zodiac element colors (for chart rendering):**

```
Element colors (used in chart wheel and aspect display):
  fire:           #E85D4A     (muted red — Aries, Leo, Sagittarius)
  earth:          #5BA858     (muted green — Taurus, Virgo, Capricorn)
  air:            #5B9FD4     (muted blue — Gemini, Libra, Aquarius)
  water:          #7B6DB5     (muted purple — Cancer, Scorpio, Pisces)

  fire-bg:        #E85D4A15   (fire at 8% opacity — sign background in wheel)
  earth-bg:       #5BA85815
  air-bg:         #5B9FD415
  water-bg:       #7B6DB515

Aspect colors:
  conjunction:    #E8ECF1     (white/neutral — 0°)
  sextile:        #5B9FD4     (blue — 60°, harmonious)
  square:         #E85D4A     (red — 90°, tension)
  trine:          #5BA858     (green — 120°, harmonious)
  opposition:     #E85D4A     (red — 180°, tension)
  quincunx:       #FBBF24     (amber — 150°, adjustment)
  minor:          #565E6C     (gray — minor aspects)
```

### 2.2 Typography

Use a single font family. Inter is the best choice: free, designed for screens, excellent at small sizes, professional.

```
Font family:     Inter (Google Fonts — also available as system font)
Fallback:        system-ui, -apple-system, sans-serif

Type scale:
  xs:            11px / 16px line-height  (labels in chart, metadata)
  sm:            13px / 20px              (secondary text, captions)
  base:          15px / 24px              (body text, descriptions)
  lg:            17px / 28px              (prominent body, list items)
  xl:            20px / 28px              (section headings)
  2xl:           24px / 32px              (page titles)
  3xl:           30px / 36px              (hero headings)

Weights:
  regular:       400   (body text)
  medium:        500   (labels, emphasis)
  semibold:      600   (headings, buttons)

Letter spacing:
  normal:        0     (body text)
  tight:         -0.02em  (headings 2xl and above)
  wide:          0.04em   (uppercase labels, tiny text)
```

### 2.3 Spacing & Layout

```
Spacing scale (use ONLY these values):
  4px    (xs)     — tight internal padding, icon-to-text gap
  8px    (sm)     — compact spacing between related items
  12px   (md)     — standard internal padding
  16px   (lg)     — standard gap between components
  24px   (xl)     — section padding, card internal padding
  32px   (2xl)    — gap between sections
  48px   (3xl)    — major section separation
  64px   (4xl)    — page-level vertical rhythm

Layout:
  Max content width:   1200px
  Card border radius:  8px
  Button border radius: 6px
  Input border radius:  6px
  Sidebar width:       280px (desktop)
```

### 2.4 Component Patterns

Design these base components in your `design-system.pen` file:

**Buttons:**
```
Primary:    bg accent-primary, text white, semibold, 13px, px-16 py-8, radius-6
Secondary:  bg transparent, border 1px accent-primary, text accent-primary
Ghost:      bg transparent, text text-secondary, hover bg-tertiary
Danger:     bg error, text white
Sizes:      sm (py-4 px-12), md (py-8 px-16), lg (py-12 px-24)
```

**Input fields:**
```
bg bg-secondary, border 1px #2A3040, text text-primary, radius-6
Focus: border accent-primary
Error: border error
Label above: text-secondary, medium, 13px, mb-4
```

**Cards:**
```
bg bg-secondary, radius-8, p-24
No border in dark mode (differentiate by background shade)
Optional: subtle border 1px #1C2333 for extra definition
```

**Navigation:**
```
Sidebar: bg bg-primary, w-280, full height
Active item: bg accent-muted, text accent-primary
Inactive item: text text-secondary, hover text-primary
```

---

## Part 3: Chart Wheel Design

This is the most important design task. The chart wheel is the visual centerpiece of the entire application.

### 3.1 Wheel Anatomy

Design the wheel at 600x600px canvas size (it will be rendered responsively).

```
From outside in:

┌─────────────────────────────┐
│ Degree labels ring          │  Outermost: planet degree/sign labels
│  ┌───────────────────────┐  │
│  │ Zodiac sign ring      │  │  12 segments, colored by element
│  │  ┌─────────────────┐  │  │
│  │  │ Planet ring      │  │  │  Planet glyphs positioned by longitude
│  │  │  ┌─────────────┐ │  │  │
│  │  │  │ House overlay│ │  │  │  House cusp lines + numbers
│  │  │  │  ┌────────┐ │ │  │  │
│  │  │  │  │ Aspect │ │ │  │  │  Aspect lines in center
│  │  │  │  │ web    │ │ │  │  │
│  │  │  │  └────────┘ │ │  │  │
│  │  │  └─────────────┘ │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 3.2 Ring Proportions

For a 600px diameter wheel:

```
Total radius:                300px
Outer gap (labels):          30px   (270-300px from center)
Zodiac ring:                 35px   (235-270px from center)
Planet ring:                 25px   (210-235px from center)
House cusp line zone:        210px  (0-210px from center)
Aspect web zone:             180px  (0-180px from center, inside cusps)

Zodiac ring proportions:
  Sign glyph size:           16px
  Degree tick marks:         every 1° (tiny), every 5° (small), every 10° (medium)
  Sign divider lines:        extend from inner to outer edge of zodiac ring

Planet ring:
  Planet glyph size:         18px
  Connection line:           1px line from glyph to exact degree on zodiac ring
  Minimum gap between glyphs: 20px (triggers collision avoidance)
```

### 3.3 Glyph Style Guide

Design glyphs as simple, geometric, single-weight line art. Consistent stroke width (1.5-2px at rendered size).

**Planet glyphs to design:**
```
☉ Sun         — circle with dot
☽ Moon        — crescent
☿ Mercury     — circle with horns and cross below
♀ Venus       — circle with cross below
♂ Mars        — circle with arrow
♃ Jupiter     — stylized 4
♄ Saturn      — stylized h with cross
♅ Uranus      — H with circle (or circle with dot and vertical lines)
♆ Neptune     — trident
♇ Pluto       — circle above crescent above cross (or PL monogram)
☊ North Node  — horseshoe shape, open top
⚷ Chiron      — K with circle
```

**Sign glyphs to design:**
```
♈ Aries       ♉ Taurus      ♊ Gemini      ♋ Cancer
♌ Leo         ♍ Virgo       ♎ Libra       ♏ Scorpio
♐ Sagittarius ♑ Capricorn   ♒ Aquarius    ♓ Pisces
```

**Aspect glyphs:**
```
☌ Conjunction (0°)    — circle or merged dots
⚹ Sextile (60°)      — six-pointed asterisk
□ Square (90°)        — small square
△ Trine (120°)        — small triangle
☍ Opposition (180°)   — two circles connected by line
⚻ Quincunx (150°)    — can use letter Q or custom glyph
```

**Style rules:**
- All glyphs use the same stroke width
- Color determined by context: planet glyphs use text-primary, sign glyphs use element color
- Design on a consistent bounding box (24x24px grid, icon area 20x20px)
- Export as SVG path data (these become constants in chart-renderer code)

### 3.4 Aspect Line Styling

```
Line width:     1.5px (major aspects), 1px (minor aspects)
Color:          per aspect type (see color palette above)
Opacity:        mapped to orb tightness:
                  exact (0-1° orb):  1.0 opacity
                  tight (1-3°):      0.7
                  medium (3-5°):     0.4
                  wide (5-8°):       0.2
Dash pattern:   solid for major aspects, dashed for minor (4px dash, 4px gap)
```

### 3.5 Dark Mode vs Light Mode

Design the chart for dark mode first (it's the primary mode). Light mode is derived by swapping the background and adjusting contrast:

```
Dark mode:
  Chart background:     bg-primary (#0A0E17)
  Ring lines:           #2A3040 (subtle)
  Sign backgrounds:     element color at 8% opacity
  Planet glyphs:        text-primary (#E8ECF1)
  House cusp lines:     #2A3040 (subtle, lighter than ring lines)
  Aspect lines:         aspect color at opacity per orb

Light mode:
  Chart background:     bg-surface (#FFFFFF)
  Ring lines:           #D0D5DD
  Sign backgrounds:     element color at 6% opacity
  Planet glyphs:        text-on-light (#1A1D24)
  House cusp lines:     #D0D5DD
  Aspect lines:         aspect color at opacity per orb (slightly higher base opacity)
```

---

## Part 4: Key Screen Wireframes

Design these 3 screens in Pencil during the design sprint. They define the app's structure.

### 4.1 Chart Input Screen

This is the first thing users interact with. Must feel simple and inviting.

```
Layout:
┌─────────────────────────────────────────────┐
│  [Nav bar: Logo    Home   Charts   Settings] │
├─────────────────────────────────────────────┤
│                                              │
│     Create Your Chart                        │
│     Enter birth details below                │
│                                              │
│     ┌─────────────────────────────────┐      │
│     │ Name (optional)                  │      │
│     │ [________________________]       │      │
│     │                                  │      │
│     │ Date of Birth                    │      │
│     │ [__/__/____]  [__:__] [AM/PM]   │      │
│     │                                  │      │
│     │ Birth Location                   │      │
│     │ [________________🔍]             │      │
│     │   → Autocomplete dropdown        │      │
│     │   → Shows lat/lon when selected  │      │
│     │                                  │      │
│     │ ┌──────────┐  ┌──────────────┐  │      │
│     │ │ House Sys │  │ Zodiac Type  │  │      │
│     │ │ Placidus▼ │  │ Tropical  ▼  │  │      │
│     │ └──────────┘  └──────────────┘  │      │
│     │                                  │      │
│     │      [ Calculate Chart ]         │      │
│     └─────────────────────────────────┘      │
│                                              │
└─────────────────────────────────────────────┘

Notes:
- Center the form card, max-width 480px
- Location input uses geocoding API with autocomplete
- House system and zodiac dropdowns default to Placidus/Tropical
- Ayanamsa dropdown appears conditionally when Sidereal is selected
- "Calculate Chart" button is primary accent color
- Generous spacing between fields (24px)
```

### 4.2 Chart Display Screen

The main screen users will spend time on.

```
Layout (desktop, > 1024px):
┌──────────────────────────────────────────────────────┐
│  [Nav]  Person Name — Jun 15, 1990, 14:30, Amsterdam │
├──────────────────────────────────────────────────────┤
│                     │                                 │
│                     │  ┌──────────────────────────┐  │
│                     │  │ Planet    Sign    House   │  │
│   ┌─────────────┐  │  │ ☉ Sun    ♊ 24°13' ← 10H │  │
│   │             │  │  │ ☽ Moon   ♏ 07°53'   4H  │  │
│   │   CHART     │  │  │ ☿ Merc   ♊ 18°45'  10H  │  │
│   │   WHEEL     │  │  │ ♀ Venus  ♉ 02°31'   9H  │  │
│   │   (600px)   │  │  │ ♂ Mars   ♈ 19°07'   8H  │  │
│   │             │  │  │ ...                       │  │
│   └─────────────┘  │  └──────────────────────────┘  │
│                     │                                 │
│  [Transits] [Asp.]  │  ┌──────────────────────────┐  │
│                     │  │ Aspects                   │  │
│                     │  │ ☉ △ ☽  orb 1°34' apply   │  │
│                     │  │ ☉ □ ♂  orb 5°06' separ   │  │
│                     │  │ ...                       │  │
│                     │  └──────────────────────────┘  │
└──────────────────────────────────────────────────────┘

Layout (mobile, < 768px):
- Chart wheel fills width (with padding)
- Planet table and aspects below the wheel (scrollable)
- Tab bar at bottom for switching views

Notes:
- Chart wheel is the focal point, takes ~60% of horizontal space on desktop
- Right panel has planet positions table and aspect grid
- Tabs below chart for switching: "Chart" / "Transits" / "Aspects" / "Houses"
- Planet table rows show: glyph, name, sign glyph, degree, house number, R if retrograde
- Aspect table shows: body1 glyph, aspect glyph, body2 glyph, orb, applying/separating
- Toolbar above chart: house system selector, zodiac toggle, theme toggle, export
```

### 4.3 Chart List / Home Screen

Where users see their saved charts.

```
Layout:
┌─────────────────────────────────────────────┐
│  [Nav bar: Logo    Home   Charts   Settings] │
├─────────────────────────────────────────────┤
│                                              │
│  My Charts                    [ + New Chart] │
│                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ Mini wheel│ │ Mini wheel│ │ Mini wheel│  │
│  │           │ │           │ │           │  │
│  │ John      │ │ Sarah     │ │ Event     │  │
│  │ ♏ Sun     │ │ ♊ Sun     │ │ ♑ Sun     │  │
│  │ Jun 1990  │ │ May 1995  │ │ Jan 2026  │  │
│  └───────────┘ └───────────┘ └───────────┘  │
│                                              │
│  ┌───────────┐ ┌───────────┐                │
│  │ Mini wheel│ │    + Add   │                │
│  │           │ │    Chart   │                │
│  │ Transit   │ │            │                │
│  │ Current   │ │            │                │
│  └───────────┘ └───────────┘                │
│                                              │
└─────────────────────────────────────────────┘

Notes:
- Grid of chart cards (3 columns desktop, 2 tablet, 1 mobile)
- Each card shows: mini chart wheel (thumbnail), name, sun sign, date
- Click card → opens Chart Display Screen
- "+ New Chart" button prominent in top right
- Free tier shows max 3 cards + "Upgrade for unlimited" prompt
- Card hover: subtle elevation increase
```

---

## Part 5: Using Pencil.dev

### 5.1 Setup

```bash
# In your astro-app repo
# Install Pencil extension in VS Code or Cursor

# Create design files
touch design-system.pen
touch chart-design.pen
touch screens.pen
```

### 5.2 Workflow with Claude Code

Pencil works via MCP with Claude Code. You can prompt it to create designs:

```
Example prompts for Pencil + Claude Code:

"Create a dark-themed card component with bg #131926, border-radius 8px,
 padding 24px, containing a heading in Inter semibold 20px #E8ECF1
 and body text in Inter regular 15px #8892A4"

"Design a form with labeled input fields for name, date, time, and location.
 Use the dark theme colors. Inputs have bg #131926, border 1px #2A3040,
 focus border #6C8EEF"

"Create a sidebar navigation with 5 items: Home, Charts, Transits,
 Settings, Help. Active state uses bg #6C8EEF1A with #6C8EEF text.
 Dark background #0A0E17, width 280px"
```

### 5.3 Design-to-Code Flow

```
1. Design in Pencil (.pen file in your repo)
2. Refine visually on the canvas
3. Use Claude Code to generate React + Tailwind from the design
4. The generated code lives alongside the design file in Git
5. Iterate: tweak design → regenerate code → refine
```

### 5.4 Chart Wheel in Pencil

The chart wheel itself is too complex for Pencil to generate (it's a Canvas 2D rendering). Use Pencil to design the surrounding UI, and for the wheel:

1. Design a single static wheel in Pencil as a visual reference (or hand-sketch it)
2. Define all proportions, colors, and glyph styles as specifications in this document
3. Implement the wheel directly in the chart-renderer TypeScript code during Phase 2
4. The renderer reads theme tokens that match your Pencil design system

---

## Part 6: Design Checklist

### Design Sprint (Week 5)

**Day 1-2: Design System**
- [ ] Create `design-system.pen` in astro-app repo
- [ ] Define color palette as Pencil variables (copy values from Part 2)
- [ ] Design button components (primary, secondary, ghost) in 3 sizes
- [ ] Design input field components (default, focus, error, disabled states)
- [ ] Design card component
- [ ] Design navigation sidebar
- [ ] Choose and test Inter font at all sizes in your scale
- [ ] Verify dark mode contrast ratios (text on backgrounds)

**Day 3-4: Chart Wheel**
- [ ] Create `chart-design.pen`
- [ ] Draw the wheel structure with correct ring proportions
- [ ] Design or select 12 zodiac sign glyphs (geometric/modern style)
- [ ] Design or select 12+ planet glyphs
- [ ] Design or select aspect glyphs
- [ ] Define aspect line colors and opacity mapping
- [ ] Design the planet position label layout (degree + sign + retrograde)
- [ ] Test collision avoidance concept: sketch a chart with a stellium (4+ planets in 30°)
- [ ] Design light mode variant of the wheel

**Day 5: Key Screens**
- [ ] Create `screens.pen`
- [ ] Design chart input screen (form card, centered layout)
- [ ] Design chart display screen (wheel + side panel, desktop layout)
- [ ] Design chart display screen (mobile layout, stacked)
- [ ] Design chart list / home screen (card grid)
- [ ] Verify consistent spacing, typography, and color usage across screens

### Before Phase 3 (2 extra days)

- [ ] Design settings screen (house system default, zodiac default, theme toggle)
- [ ] Design user profile / account screen
- [ ] Design premium upgrade prompt / paywall screen
- [ ] Design empty states (no charts yet, loading, error)
- [ ] Design responsive breakpoints (desktop → tablet → mobile)
- [ ] Export any SVG glyphs as path data for the renderer

---

## Part 7: Visual References

Search for these apps and websites to inform your design direction. Don't copy — absorb the feeling.

**Minimalist astrology inspiration:**
- Co-Star app (iOS) — extreme minimalism, black and white, sharp typography
- Pattern app — clean dark UI, good use of accent colors
- TimePassages — professional but slightly traditional, good chart rendering
- The Pattern — modern mobile-first, interesting data visualization approach

**General design inspiration for the style you want:**
- Linear.app — dark theme, clean lines, excellent typography
- Raycast — dark UI with subtle color accents
- Vercel dashboard — minimalist, great spacing
- Supabase dashboard — clean dark/light mode

**Chart wheel references:**
- Astro.com chart output — the gold standard for chart accuracy
- Solar Fire — professional desktop software, information-dense
- Astro Gold (iOS) — good mobile chart rendering

The key insight from looking at existing astrology apps: most are either (a) visually cluttered and dated, or (b) too minimal to be useful for serious astrology. Your opportunity is the middle ground — clean and modern but informationally complete.

---

## Part 8: Glyph Resources

If designing glyphs from scratch feels overwhelming, you have options:

**Option A: Design your own (recommended for brand identity)**
Sketch them on paper first. Use a consistent grid (24x24). Keep strokes uniform. Simplify traditional forms to their geometric essence. This becomes part of your app's unique identity.

**Option B: Use an existing astrological font as reference**
Look at these for inspiration (but redraw in your own style to avoid licensing issues):
- Astro.ttf / AstroDotBasic font families
- Hamburg Symbol fonts
- Redraw simplified versions as SVG paths

**Option C: Commission glyph design**
Have a designer on Fiverr create a custom astrological glyph set matching your design direction. Specify: modern, geometric, single-weight, 24x24px grid, delivered as SVG. Budget: $50-150 for a complete set.

Whichever option you choose, the final deliverable is SVG path data that gets embedded in your chart-renderer TypeScript code as constants.
