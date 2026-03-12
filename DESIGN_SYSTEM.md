# Design System Specification

## Overview

This document defines every visual token used across the application. The chart-renderer themes must use these exact values. All colors are in hex format. Spacing values are in pixels.

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

| Token | Hex (Dark) | Hex (Light) | Usage |
|-------|-----------|------------|-------|
| `text-primary` | `#E8ECF1` | `#1A1D24` | Main body text |
| `text-secondary` | `#8892A4` | `#5A6275` | Labels, captions, muted text |
| `text-tertiary` | `#565E6C` | `#8892A4` | Disabled, placeholder |
| `text-accent` | `#6C8EEF` | `#4A6FD4` | Links, interactive text |

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

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
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

Use ONLY these values. Never eyeball spacing.

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

## Layout

| Property | Value |
|----------|-------|
| Max content width | 1200px |
| Sidebar width (desktop) | 280px |
| Card border radius | 8px |
| Button border radius | 6px |
| Input border radius | 6px |
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

**Primary:**
```
Background: accent-primary (#6C8EEF)
Text: #FFFFFF
Font: Inter 13px semibold
Padding: 8px 16px
Border radius: 6px
Hover: accent-hover (#8BA5F5)
Active: accent-pressed (#5A7AD4)
```

**Secondary:**
```
Background: transparent
Border: 1px solid accent-primary
Text: accent-primary
Hover: accent-subtle background
```

**Ghost:**
```
Background: transparent
Text: text-secondary
Hover: bg-tertiary
```

### Input Fields

```
Background: bg-input (#0F1420)
Border: 1px solid border-subtle (#2A3040)
Text: text-primary (#E8ECF1)
Placeholder: text-tertiary (#565E6C)
Font: Inter 15px regular
Padding: 8px 12px
Border radius: 6px
Focus border: accent-primary (#6C8EEF)
Error border: error (#F87171)
Label: text-secondary, Inter 13px medium, margin-bottom 4px
```

### Cards

```
Background: bg-secondary (#131926)
Border radius: 8px
Padding: 24px
No border in dark mode (differentiate by background shade)
Light mode: border 1px solid border-light
```

### Navigation Sidebar

```
Background: bg-primary (#0A0E17)
Width: 280px
Item padding: 8px 16px
Active item: bg accent-muted (#6C8EEF1A), text accent-primary (#6C8EEF)
Inactive item: text text-secondary (#8892A4)
Hover: text text-primary (#E8ECF1)
Section gap: 32px
```
