# Design System Specification

## Overview

This document defines every visual token used across the application. The chart-renderer themes must use these exact values. All colors are in hex format. Spacing values are in pixels, derived from a 4px base unit.

---

## Color Palette

### Core Colors (Dark Mode — Primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0A0E17` | Main app background, chart background |
| `bg-secondary` | `#131926` | Cards, panels, elevated surfaces |
| `bg-tertiary` | `#1C2333` | Hover states, active areas, input backgrounds |
| `bg-input` | `#0F1420` | Input field backgrounds |
| `border-subtle` | `#2A3040` | Borders, dividers, chart ring strokes |
| `border-default` | `#353D4F` | Input borders, card borders on hover |

### Core Colors (Light Mode)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-surface` | `#FFFFFF` | Main background |
| `bg-surface-alt` | `#F5F6F8` | Cards, panels |
| `bg-surface-hover` | `#ECEEF2` | Hover states |
| `border-light` | `#D0D5DD` | Borders, dividers |
| `border-light-strong` | `#B0B8C4` | Input borders, emphasis |

### Text Colors

| Token | Hex (Dark) | Hex (Light) | Contrast on bg-primary | Usage |
|-------|-----------|------------|----------------------|-------|
| `text-primary` | `#E8ECF1` | `#1A1D24` | 13.5:1 | Main body text |
| `text-secondary` | `#8892A4` | `#5A6275` | 5.1:1 | Labels, captions, muted text |
| `text-tertiary` | `#6B7385` | `#8892A4` | 4.0:1 | Disabled, placeholder (large text only) |
| `text-accent` | `#6C8EEF` | `#4A6FD4` | 5.8:1 | Links, interactive text |

> **Accessibility note:** `text-tertiary` at 4.0:1 passes WCAG AA for text 18px+ or 14px bold. Never use it for body text at `text-sm` (13px) or smaller. Use `text-secondary` as the minimum for readable small text.

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-primary` | `#6C8EEF` | Primary buttons, active states, links |
| `accent-hover` | `#8BA5F5` | Primary button hover |
| `accent-pressed` | `#5A7AD4` | Primary button active/pressed |
| `accent-muted` | `#6C8EEF1A` | Accent at 10% opacity — subtle highlights, active nav bg |
| `accent-subtle` | `#6C8EEF0D` | Accent at 5% opacity — hover backgrounds |

### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#4ADE80` | Positive, confirmation |
| `warning` | `#FBBF24` | Caution, attention |
| `error` | `#F87171` | Error, destructive actions |
| `info` | `#60A5FA` | Informational |

### Focus Ring

| Token | Value | Usage |
|-------|-------|-------|
| `focus-ring` | `0 0 0 2px #0A0E17, 0 0 0 4px #6C8EEF` | Keyboard focus indicator on all interactive elements |

All interactive elements (buttons, inputs, links, nav items, cards) must show `focus-ring` on `:focus-visible`.

### Zodiac Element Colors

| Element | Hex | Signs |
|---------|-----|-------|
| `fire` | `#E85D4A` | Aries, Leo, Sagittarius |
| `earth` | `#5BA858` | Taurus, Virgo, Capricorn |
| `air` | `#5B9FD4` | Gemini, Libra, Aquarius |
| `water` | `#7B6DB5` | Cancer, Scorpio, Pisces |

**Background variants (for chart sign segments):**

| Token | Hex | Usage |
|-------|-----|-------|
| `fire-bg` | `#E85D4A15` | 8% opacity — sign segment background |
| `earth-bg` | `#5BA85815` | |
| `air-bg` | `#5B9FD415` | |
| `water-bg` | `#7B6DB515` | |

### Aspect Colors

| Aspect | Hex | Line Style |
|--------|-----|-----------|
| Conjunction (0°) | `#E8ECF1` | Solid, 1.5px |
| Sextile (60°) | `#5B9FD4` | Solid, 1.5px |
| Square (90°) | `#E85D4A` | Solid, 1.5px |
| Trine (120°) | `#5BA858` | Solid, 1.5px |
| Opposition (180°) | `#E85D4A` | Solid, 1.5px |
| Quincunx (150°) | `#FBBF24` | Solid, 1.5px |
| Semi-sextile (30°) | `#565E6C` | Dashed 4-4, 1px |
| Semi-square (45°) | `#565E6C` | Dashed 4-4, 1px |
| Sesquisquare (135°) | `#565E6C` | Dashed 4-4, 1px |
| Quintile (72°) | `#565E6C` | Dashed 4-4, 1px |
| Bi-quintile (144°) | `#565E6C` | Dashed 4-4, 1px |

**Aspect opacity mapping (based on orb):**

| Orb Range | Opacity |
|-----------|---------|
| 0–1° (exact) | 1.0 |
| 1–3° (tight) | 0.7 |
| 3–5° (medium) | 0.4 |
| 5°+ (wide) | 0.2 |

---

## Typography

### Font

```
Primary:   Inter
Fallback:  system-ui, -apple-system, sans-serif
Source:    Google Fonts (https://fonts.google.com/specimen/Inter)
```

### Type Scale

| Token | Size | Line Height | Default Weight | Usage |
|-------|------|-------------|----------------|-------|
| `text-xs` | 11px | 16px | 400 | Chart labels, metadata, timestamps |
| `text-sm` | 13px | 20px | 400 | Secondary text, captions, table cells |
| `text-base` | 15px | 24px | 400 | Body text, descriptions |
| `text-lg` | 17px | 28px | 400 | Prominent body, list items |
| `text-xl` | 20px | 28px | 600 | Section headings |
| `text-2xl` | 24px | 32px | 600 | Page titles |
| `text-3xl` | 30px | 36px | 600 | Hero headings |

### Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-normal` | 400 | Body text, descriptions |
| `font-medium` | 500 | Labels, emphasis, nav items |
| `font-semibold` | 600 | Headings, buttons, important text |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-normal` | 0 | Body text |
| `tracking-tight` | -0.02em | Headings (2xl and above) |
| `tracking-wide` | 0.04em | Uppercase labels, small text |

---

## Spacing

All spacing derives from a **4px base unit**. Use ONLY these values. Never eyeball spacing.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon-to-text gap, tight internal padding |
| `space-2` | 8px | Compact spacing between related items |
| `space-3` | 12px | Standard internal padding |
| `space-4` | 16px | Standard gap between components |
| `space-6` | 24px | Card internal padding, section padding |
| `space-8` | 32px | Gap between sections |
| `space-12` | 48px | Major section separation |
| `space-16` | 64px | Page-level vertical rhythm |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-xs` | 2px | Inline badges, small tags |
| `radius-sm` | 4px | Compact elements, chips |
| `radius-md` | 6px | Buttons, inputs, dropdowns |
| `radius-lg` | 8px | Cards, panels |
| `radius-xl` | 12px | Modals, large containers |
| `radius-full` | 9999px | Pills, avatars, toggle knobs |

---

## Elevation (Shadows)

Dark mode relies primarily on background shade layering for depth. Shadows are used sparingly in dark mode and more prominently in light mode.

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `shadow-none` | none | none | Default / flat elements |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (cards on hover) |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | `0 4px 12px rgba(0,0,0,0.08)` | Dropdowns, popovers, tooltips |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, dialogs |

---

## Layout

| Property | Value |
|----------|-------|
| Max content width | 1200px |
| Sidebar width (desktop) | 280px |
| Chart default diameter | 600px |
| Chart min diameter | 300px |
| Chart max diameter | 1200px |

### Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | < 768px | Single column, chart full width |
| Tablet | 768–1024px | Two columns, narrower sidebar |
| Desktop | > 1024px | Full layout with sidebar |

---

## Chart Wheel Dimensions

All proportions are relative to the total wheel radius.

| Zone | Outer (% of radius) | Inner (% of radius) | Purpose |
|------|---------------------|---------------------|---------|
| Label ring | 100% | 90% | Planet degree/minute labels |
| Zodiac ring | 90% | 78.3% | 12 sign segments with glyphs |
| Planet ring | 78.3% | 70% | Planet glyph positions |
| House zone | 70% | 15% | House cusp lines |
| Aspect zone | 60% | 0% | Aspect lines between planets |

### Glyph Sizes (at 600px wheel diameter)

| Element | Size |
|---------|------|
| Planet glyph | 18px |
| Zodiac sign glyph | 16px |
| Degree label font | 11px |
| House number font | 13px |

### Structural Lines

| Element | Width (dark) | Color (dark) |
|---------|-------------|-------------|
| Ring outlines | 1px | `#2A3040` |
| Sign dividers | 1px | `#2A3040` |
| House cusps (normal) | 1px | `#2A3040` |
| House cusps (ASC/MC) | 2px | `#6C8EEF` |
| Leader lines | 0.5px | `#2A3040` |

---

## Component Specifications

### Buttons

Three variants, three sizes. All sizes use `font-semibold` (600) weight and `radius-md` (6px).

**Sizes:**

| Size | Padding | Font Size | Min Height |
|------|---------|-----------|------------|
| `sm` | 4px 12px | 12px | 28px |
| `md` | 8px 16px | 13px | 34px |
| `lg` | 12px 24px | 14px | 42px |

**Primary (fill):**

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | `accent-primary` | `#FFFFFF` | none |
| Hover | `accent-hover` | `#FFFFFF` | none |
| Active | `accent-pressed` | `#FFFFFF` | none |
| Disabled | `accent-primary` at 40% opacity | `#FFFFFF` at 50% opacity | none |
| Focus | `accent-primary` | `#FFFFFF` | `focus-ring` |

**Secondary (outline):**

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | transparent | `accent-primary` | 1px `accent-primary` |
| Hover | `accent-subtle` | `accent-primary` | 1px `accent-primary` |
| Active | `accent-muted` | `accent-primary` | 1px `accent-primary` |
| Disabled | transparent | `accent-primary` at 40% | 1px `accent-primary` at 40% |
| Focus | transparent | `accent-primary` | `focus-ring` |

**Ghost (text):**

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | transparent | `text-secondary` | none |
| Hover | `bg-tertiary` | `text-primary` | none |
| Active | `border-subtle` | `text-primary` | none |
| Disabled | transparent | `text-tertiary` | none |
| Focus | transparent | `text-secondary` | `focus-ring` |

**Danger:**

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | `error` | `#FFFFFF` | none |
| Hover | `#EF5858` | `#FFFFFF` | none |
| Active | `#DC4444` | `#FFFFFF` | none |
| Focus | `error` | `#FFFFFF` | `0 0 0 2px #0A0E17, 0 0 0 4px #F87171` |

### Input Fields

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | `bg-input` | 1px `border-subtle` | `text-primary` |
| Placeholder | `bg-input` | 1px `border-subtle` | `text-tertiary` |
| Hover | `bg-input` | 1px `border-default` | `text-primary` |
| Focus | `bg-input` | 1px `accent-primary` | `text-primary` |
| Error | `bg-input` | 1px `error` | `text-primary` |
| Disabled | `bg-tertiary` | 1px `border-subtle` | `text-tertiary` |

```
Font: Inter 15px regular
Padding: 8px 12px
Border radius: radius-md (6px)
Label: text-secondary, Inter 13px medium, margin-bottom 4px
Error message: error color, Inter 13px regular, margin-top 4px
Cursor when disabled: not-allowed
```

### Cards

| State | Background | Border (dark) | Border (light) | Shadow |
|-------|-----------|--------------|----------------|--------|
| Default | `bg-secondary` | none | 1px `border-light` | `shadow-none` |
| Hover | `bg-secondary` | 1px `border-default` | 1px `border-light-strong` | `shadow-sm` |
| Active | `bg-secondary` | 1px `accent-primary` | 1px `accent-primary` | `shadow-none` |

```
Border radius: radius-lg (8px)
Padding: 24px
Focus (when clickable): focus-ring
```

### Navigation Sidebar

```
Background: bg-primary (#0A0E17)
Width: 280px
Section gap: 32px
```

**Nav items:**

| State | Background | Text | Icon |
|-------|-----------|------|------|
| Default | transparent | `text-secondary` | `text-secondary` |
| Hover | `bg-tertiary` | `text-primary` | `text-primary` |
| Active | `accent-muted` | `accent-primary` | `accent-primary` |
| Focus | transparent | `text-secondary` | `text-secondary` + `focus-ring` |

```
Item padding: 8px 16px
Item border radius: radius-md (6px)
Icon-to-label gap: space-2 (8px)
Icon size: 16px
Font: Inter 14px medium
```

### Dropdowns / Select

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | `bg-input` | 1px `border-subtle` | `text-primary` |
| Hover | `bg-input` | 1px `border-default` | `text-primary` |
| Open | `bg-input` | 1px `accent-primary` | `text-primary` |
| Disabled | `bg-tertiary` | 1px `border-subtle` | `text-tertiary` |

```
Menu background: bg-secondary
Menu border: 1px border-default
Menu shadow: shadow-md
Menu border radius: radius-md (6px)
Option padding: 8px 12px
Option hover: bg-tertiary
Option selected: accent-muted background, accent-primary text
Max visible options: 6 (then scroll)
```

### Tooltips

```
Background: bg-tertiary (#1C2333)
Text: text-primary (#E8ECF1)
Font: Inter 13px regular
Padding: 4px 8px
Border radius: radius-sm (4px)
Shadow: shadow-md
Max width: 240px
```

### Modals / Dialogs

```
Overlay: #000000 at 60% opacity
Background: bg-secondary (#131926)
Border radius: radius-xl (12px)
Padding: 24px
Shadow: shadow-lg
Max width: 480px (small), 640px (medium), 800px (large)
Title: text-primary, text-xl (20px), font-semibold
Close button: top-right, ghost button, 16px icon
```

---

## Transition & Animation

| Token | Value | Usage |
|-------|-------|-------|
| `duration-fast` | 100ms | Color changes, opacity |
| `duration-normal` | 150ms | Background, border, shadow |
| `duration-slow` | 250ms | Layout shifts, transforms |
| `easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `easing-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |
| `easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |

Apply `duration-normal` with `easing-default` to all interactive state changes (hover, focus, active) unless otherwise specified.
