# Planetary Hours Card — Design Spec

## Overview

A compact card on the home screen showing the current planetary hour, day ruler, and progress within the hour. Expands inline to show all 24 planetary hours for the day.

**Location:** Right column, directly below MoonCard
**Tier:** Free
**Backend changes:** None — pure client-side calculation
**New dependency:** `suncalc` npm package (~4KB)

## Data Sources

- **Sunrise/sunset:** `suncalc` library using user's current lat/lon from `useCurrentSky`
- **Weekday:** JavaScript `Date`
- **Chaldean sequence:** Static lookup table
- **No API calls required**

## Visual Design

### Compact Mode (default)

Single card matching existing card styling (bg-card, rounded-lg, border, card-hover).

```
┌──────────────────────────────────────────────────────┐
│  ☉ Day of Sun  ·  ♀ Hour of Venus  ·  until 4:12 pm │
│  ━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━                    │
│  next hour: ☿ Mercury                                │
└──────────────────────────────────────────────────────┘
```

- Planet glyphs use accent colors
- Progress bar: thin horizontal bar, filled portion in accent-primary
- "until" time formatted per user's timeFormat setting (12h/24h)
- "next:" in text-muted-foreground

### Expanded Mode (click to expand, accordion)

Expands inline, pushing content below it down. Same card container grows.

```
┌──────────────────────────────────────────────────────┐
│  Today's Planetary Hours                   ☉ Sunday  │
│                                                       │
│  Day Hours (sunrise 06:42 — sunset 19:58)            │
│   1. ☉ Sun      06:42 – 07:47                       │
│   2. ♀ Venus    07:47 – 08:53                       │
│   3. ☿ Mercury  08:53 – 09:58    ← current          │
│   4. ☽ Moon     09:58 – 11:04                       │
│   5. ♄ Saturn   11:04 – 12:09                       │
│   6. ♃ Jupiter  12:09 – 13:15                       │
│   7. ♂ Mars     13:15 – 14:20                       │
│   8. ☉ Sun      14:20 – 15:26                       │
│   9. ♀ Venus    15:26 – 16:31                       │
│  10. ☿ Mercury  16:31 – 17:37                       │
│  11. ☽ Moon     17:37 – 18:42                       │
│  12. ♄ Saturn   18:42 – 19:48                       │
│                                                       │
│  Night Hours (sunset 19:58 — sunrise 06:38)          │
│   1. ♃ Jupiter  19:48 – 20:42                       │
│   2. ♂ Mars     20:42 – 21:37                       │
│   ...                                                │
│  12. ☿ Mercury  05:33 – 06:38                       │
└──────────────────────────────────────────────────────┘
```

- Current hour row: bg-tertiary highlight
- Day/night sections separated by a subtle divider with sunrise/sunset times
- Times formatted per user's timeFormat setting
- Heading uses font-display (Cormorant Garamond)
- Expand/collapse with smooth height animation

## Calculation

### Constants

```typescript
const CHALDEAN_ORDER = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];

const DAY_RULERS: Record<number, string> = {
  0: "sun",       // Sunday
  1: "moon",      // Monday
  2: "mars",      // Tuesday
  3: "mercury",   // Wednesday
  4: "jupiter",   // Thursday
  5: "venus",     // Friday
  6: "saturn",    // Saturday
};
```

### Types

```typescript
interface PlanetaryHour {
  planet: string;
  start: Date;
  end: Date;
  isDay: boolean;
  hourNumber: number; // 1–12
}

interface PlanetaryHoursResult {
  dayRuler: string;
  currentHour: PlanetaryHour;
  nextHour: PlanetaryHour;
  allHours: PlanetaryHour[];   // 24 entries (12 day + 12 night)
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
}
```

### Algorithm

1. Get sunrise/sunset for today and sunrise for tomorrow using `suncalc.getTimes(date, lat, lon)`
2. Day hour duration = (sunset - sunrise) / 12
3. Night hour duration = (tomorrow sunrise - sunset) / 12
4. First day hour starts at sunrise, ruled by the weekday's day ruler
5. Subsequent hours follow Chaldean order (cycling): Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → repeat
6. First night hour continues the Chaldean sequence from where day hours ended
7. Find current hour by checking which hour interval contains `now`

### Edge Cases

- **Before sunrise:** Current time falls in previous day's night hours. Calculate using yesterday's sunset → today's sunrise.
- **Polar regions:** `suncalc` returns `NaN` for sunrise/sunset during polar day/night. Show a "not available at this latitude" message.

## Component Structure

### New Files

- `apps/web/src/components/home/planetary-hours.tsx` — React component
- `apps/web/src/lib/planetary-hours.ts` — Pure calculation logic (testable without React)
- `apps/web/src/lib/planetary-hours.test.ts` — Unit tests for calculation

### Integration

- Import and add `<PlanetaryHours />` in `routes/home.tsx`, right column after `<MoonCard />`
- Component receives `location: { lat, lon }` from `useCurrentSky`
- Uses `useSettings` for `timeFormat`

## Update Frequency

Calculated once on page load. Refreshes on page reload. Real-time auto-update via `setTimeout` is a future improvement (tracked in `future_improvements.md`).
