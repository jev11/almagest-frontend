# Feature Improvements — Inspired by Solar Fire Analysis

## Overview

This document specifies additional astrological features identified from analyzing Solar Fire, a professional-grade astrology program. Features are organized by where they appear in the app and their implementation priority. All calculations are pure math — no backend API changes unless noted.

---

## 1. Lunar Phase Calendar

**Location:** Home screen, below the Moon card
**Priority:** High — users check this daily
**Tier:** Free
**Backend changes:** None — calculated client-side from Sun and Moon positions

### Specification

Show the next 4-5 lunar phases with exact datetime and zodiac degree.

```
┌──────────────────────────────────────────────────────┐
│  Upcoming Lunar Phases                                │
│                                                       │
│  ● Full Moon      Apr 1    8:13 pm    12°♎21'       │
│  ◑ 3rd Quarter    Apr 9   10:52 pm    20°♑20'       │
│  ○ New Moon       Apr 17   5:52 am    27°♈28'       │
│  ◐ 1st Quarter    Apr 23   8:32 pm    03°♌56'       │
│  ● Full Moon      May 1    3:18 am    10°♏42'       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Visual Design

- Compact card, same styling as other home screen sections
- Phase icons: ○ (new), ◐ (1st quarter), ● (full), ◑ (3rd quarter)
- Four columns: icon + phase name, date, time (user's local timezone), degree + sign glyph
- Current/next phase row subtly highlighted (bg-tertiary or left accent border)
- Sign degree colored by element (fire red, earth green, air blue, water purple)

### Calculation

Lunar phases occur when the Sun-Moon elongation reaches specific angles:

```typescript
// Phase angles (Moon longitude - Sun longitude, normalized 0-360)
// New Moon:      0°   (conjunction)
// 1st Quarter:  90°   (waxing square)
// Full Moon:    180°  (opposition)  
// 3rd Quarter:  270°  (waning square)

interface LunarPhase {
  type: "new" | "first_quarter" | "full" | "third_quarter";
  datetime: Date;           // Exact moment of phase
  longitude: number;        // Moon's longitude at exact phase
  sign: ZodiacSign;
  degree: number;
  minute: number;
}

function findNextLunarPhases(fromDate: Date, count: number): LunarPhase[]
```

**Algorithm:**
1. Calculate current Sun-Moon elongation using approx-engine
2. Determine which phase is next (which angle boundary is closest ahead)
3. Use iterative bisection to find the exact moment the elongation crosses the target angle
4. Step forward to find subsequent phases
5. For each phase: record the Moon's zodiac position at that moment

**Accuracy:** Using the approx-engine, phase times will be accurate to ~15-30 minutes. This is adequate for display. For exact times, snap to server (API call) on page load.

**API enhancement (optional, for precision):**
```
GET /v1/ephemeris/lunar-phases?from=2026-04-01&count=5
```
Returns precise phase times calculated with Swiss Ephemeris. This could be a Phase 5 backend addition.

---

## 2. Planetary Hours

**Location:** Home screen, compact row above or below the Current Sky section
**Priority:** High — essential for traditional/horary astrologers, low effort
**Tier:** Free
**Backend changes:** None — pure math based on sunrise/sunset

### Specification

Show the current planetary hour, the planet ruling it, and when it changes.

```
┌──────────────────────────────────────────────────────┐
│  ☉ Day of Sun  ·  ♀ Hour of Venus  ·  until 4:12 pm │
│  ━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━                    │
│  next: ☿ Mercury                                     │
└──────────────────────────────────────────────────────┘
```

Expanded view (click/tap to expand):
```
┌──────────────────────────────────────────────────────┐
│  Today's Planetary Hours                   ☉ Sunday  │
│                                                       │
│  Day Hours (sunrise 06:42 — sunset 19:58)            │
│   1. ☉ Sun      06:42 - 07:47                       │
│   2. ♀ Venus    07:47 - 08:53                       │
│   3. ☿ Mercury  08:53 - 09:58    ← current          │
│   4. ☽ Moon     09:58 - 11:04                       │
│   5. ♄ Saturn   11:04 - 12:09                       │
│   6. ♃ Jupiter  12:09 - 13:15                       │
│   7. ♂ Mars     13:15 - 14:20                       │
│   8. ☉ Sun      14:20 - 15:26                       │
│   9. ♀ Venus    15:26 - 16:31                       │
│  10. ☿ Mercury  16:31 - 17:37                       │
│  11. ☽ Moon     17:37 - 18:42                       │
│  12. ♄ Saturn   18:42 - 19:48                       │
│                                                       │
│  Night Hours (sunset 19:58 — sunrise 06:38)          │
│   1. ♃ Jupiter  19:48 - 20:42                       │
│   2. ♂ Mars     20:42 - 21:37                       │
│   ...                                                │
└──────────────────────────────────────────────────────┘
```

### Visual Design

- Compact mode: single row, inline with other data
- Progress bar showing position within current hour
- Current hour planet glyph in accent color
- Expanded mode: full table of 24 hours (12 day + 12 night)
- Current hour row highlighted with bg-tertiary
- Day hours and night hours separated by a subtle divider

### Calculation

```typescript
// Chaldean order of planets (repeating cycle)
const CHALDEAN_ORDER = [
  "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"
];

// Day rulers (the planet that rules the first hour of each day)
const DAY_RULERS: Record<number, string> = {
  0: "sun",       // Sunday
  1: "moon",      // Monday
  2: "mars",      // Tuesday
  3: "mercury",   // Wednesday
  4: "jupiter",   // Thursday
  5: "venus",     // Friday
  6: "saturn",    // Saturday
};

interface PlanetaryHour {
  planet: string;
  start: Date;
  end: Date;
  isDay: boolean;       // true = day hour, false = night hour
  hourNumber: number;   // 1-12
}

interface PlanetaryHoursResult {
  dayRuler: string;           // Planet ruling the day (based on weekday)
  currentHour: PlanetaryHour; // Currently active hour
  nextHour: PlanetaryHour;    // Next upcoming hour
  allHours: PlanetaryHour[];  // All 24 hours (12 day + 12 night)
  sunrise: Date;
  sunset: Date;
}

function calculatePlanetaryHours(
  date: Date,
  latitude: number,
  longitude: number,
): PlanetaryHoursResult
```

**Algorithm:**
1. Calculate sunrise and sunset for the given date and location
   - Use a sunrise/sunset formula (e.g., NOAA solar calculator algorithm)
   - Needs latitude, longitude, and date
   - Accounts for atmospheric refraction
2. Day hour duration = (sunset - sunrise) / 12
3. Night hour duration = (next sunrise - sunset) / 12
4. First day hour starts at sunrise, ruled by the day ruler
5. Subsequent hours follow Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → repeat
6. First night hour continues the sequence from where day hours ended

**Sunrise/sunset calculation:**
This requires a solar position algorithm. The approx-engine already calculates Sun position (VSOP87), so you can derive sunrise/sunset from that:
- Find when the Sun's altitude = -0.833° (accounting for refraction)
- Use iterative approach: calculate Sun altitude at intervals, bisect to find exact crossing

Alternatively, use a lightweight library like `suncalc` (npm package, ~4KB) which does exactly this.

**Location for planetary hours:**
Use the user's current location (browser geolocation API or saved location from settings). This is different from birth location — planetary hours are based on where you are now.

---

## 3. Enhanced Retrograde Tracker with Station Dates

**Location:** Home screen, replaces current retrograde tracker
**Priority:** High — station dates are the most-asked retrograde question
**Tier:** Free (basic), Premium (full station table)
**Backend changes:** Optional API endpoint for precise station dates

### Specification

Enhance the current retrograde tracker to show station dates and speed status.

```
┌──────────────────────────────────────────────────────┐
│  Planetary Motion                                     │
│                                                       │
│  ☿ Mercury   ℞ Retrograde   stations ☍ Apr 7 (9 days)│
│              ━━━●━━━━━━━━━━━━━━━━━━━━                │
│              retro since Mar 15 · direct Apr 7        │
│                                                       │
│  ♇ Pluto     ℞ Retrograde   stations ☍ Oct 18       │
│                                                       │
│  ♀ Venus     → Fast          no station soon         │
│  ♂ Mars      → Fast          stations ℞ Jan 6, 2027  │
│  ♃ Jupiter   → Direct        stations ℞ Nov 11       │
│  ♄ Saturn    → Direct        stations ℞ Aug 13       │
│                                                       │
│  ♅ Uranus    → Direct        stations ℞ Nov 16       │
│  ♆ Neptune   → Direct        stations ℞ Dec 5        │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Visual Design

- Retrograde planets at top, visually prominent with ℞ badge in error color
- Progress bar for retrograde planets: shows position within the retrograde period
  (retrograde start → station direct), with dot at current position
- "stations ☍ Apr 7 (9 days)" — countdown in parentheses
- Direct planets shown in compact format, text-secondary color
- Speed indicator: "Fast" (> average speed), "Slow" (< average), "Stationary" (< 10% of average)
- Next station date for all planets (when they next change direction)
- Free tier: show retrograde planets + next station only
- Premium: full table with all planets, speeds, and both last/next stations

### Calculation

```typescript
// Average daily speeds for comparison (degrees/day)
const MEAN_SPEEDS: Record<string, number> = {
  sun: 0.9856,
  moon: 13.176,
  mercury: 1.383,
  venus: 1.200,
  mars: 0.524,
  jupiter: 0.083,
  saturn: 0.034,
  uranus: 0.012,
  neptune: 0.006,
  pluto: 0.004,
};

type SpeedCategory = "fast" | "slow" | "stationary" | "retrograde";

interface PlanetMotion {
  body: string;
  speed: number;              // Current speed in degrees/day
  speedCategory: SpeedCategory;
  isRetrograde: boolean;
  lastStationDate: Date | null;    // When it last changed direction
  lastStationType: "direct" | "retrograde";
  nextStationDate: Date | null;    // When it next changes direction
  nextStationType: "direct" | "retrograde";
  daysUntilNextStation: number | null;
}

function calculatePlanetaryMotion(
  positions: Record<string, CelestialPosition>,
  date: Date,
): PlanetMotion[]
```

**Finding station dates:**
A station occurs when a planet's speed crosses zero (changes sign). The approx-engine can approximate this:
1. Calculate speed at the current date
2. Step forward in 1-day increments, checking speed sign
3. When speed sign changes, bisect to find exact station moment
4. For precision, snap to server data

**API enhancement (recommended for precision):**
```
GET /v1/ephemeris/stations?bodies=mercury,venus,mars,jupiter,saturn,uranus,neptune,pluto&from=2026-01-01&to=2027-01-01
```
Returns exact station dates calculated with Swiss Ephemeris. Cache aggressively — stations don't change.

---

## 4. Essential Dignities Full Table

**Location:** Chart display page, new panel in the right column
**Priority:** Medium — important for traditional astrologers
**Tier:** Free (basic dignities — domicile, exaltation, detriment, fall), Premium (full table with triplicity, term, face)
**Backend changes:** Extend dignity calculation in astro-api

### Specification

Full traditional dignity breakdown for each planet in the chart.

```
┌────────────────────────────────────────────────────────────┐
│  Essential Dignities                                        │
│                                                             │
│  Planet  Rul  Exalt  Trip  Term  Face  Detr  Fall  Score   │
│  ☉ Sun    —    —      ♃     ♄     ♂     —     —     -2    │
│  ☽ Moon   —    —      ♀     ♃     ☽     —     —     +3    │
│  ☿ Merc   ☿    ☿      —     ☿     —     —     —     +8    │
│  ♀ Venus  —    ♀      —     —     ♃     —     —     +5    │
│  ♂ Mars   —    —      —     ♂     —     —     ♂     -3    │
│  ♃ Jup    —    —      ☉     —     —     —     —     +1    │
│  ♄ Sat    ♄    —      —     —     ♄     —     —     +8    │
│                                                             │
│  Scoring: Domicile +5, Exaltation +4, Triplicity +3,      │
│  Term +2, Face +1, Detriment -5, Fall -4, Peregrine 0     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Dignity Tables

```typescript
// Triplicity rulers (Dorothean system)
// Each element has day, night, and participating rulers
interface TriplicityRulers {
  day: string;
  night: string;
  participating: string;
}

const TRIPLICITY: Record<Element, TriplicityRulers> = {
  fire:  { day: "sun",     night: "jupiter", participating: "saturn" },
  earth: { day: "venus",   night: "moon",    participating: "mars" },
  air:   { day: "saturn",  night: "mercury", participating: "jupiter" },
  water: { day: "venus",   night: "mars",    participating: "moon" },
};

// Egyptian/Ptolemaic terms (bounds)
// Each sign is divided into 5 unequal sections, each ruled by a planet
// Format: [planet, endDegree]
type TermEntry = [string, number];

const TERMS: Record<ZodiacSign, TermEntry[]> = {
  aries:       [["jupiter", 6], ["venus", 12], ["mercury", 20], ["mars", 25], ["saturn", 30]],
  taurus:      [["venus", 8], ["mercury", 14], ["jupiter", 22], ["saturn", 27], ["mars", 30]],
  gemini:      [["mercury", 6], ["jupiter", 12], ["venus", 17], ["mars", 24], ["saturn", 30]],
  cancer:      [["mars", 7], ["venus", 13], ["mercury", 19], ["jupiter", 26], ["saturn", 30]],
  leo:         [["jupiter", 6], ["venus", 11], ["saturn", 18], ["mercury", 24], ["mars", 30]],
  virgo:       [["mercury", 7], ["venus", 17], ["jupiter", 21], ["mars", 28], ["saturn", 30]],
  libra:       [["saturn", 6], ["mercury", 14], ["jupiter", 21], ["venus", 28], ["mars", 30]],
  scorpio:     [["mars", 7], ["venus", 11], ["mercury", 19], ["jupiter", 24], ["saturn", 30]],
  sagittarius: [["jupiter", 12], ["venus", 17], ["mercury", 21], ["saturn", 26], ["mars", 30]],
  capricorn:   [["mercury", 7], ["jupiter", 14], ["venus", 22], ["saturn", 26], ["mars", 30]],
  aquarius:    [["mercury", 7], ["venus", 13], ["jupiter", 20], ["mars", 25], ["saturn", 30]],
  pisces:      [["venus", 12], ["jupiter", 16], ["mercury", 19], ["mars", 28], ["saturn", 30]],
};

// Chaldean decans (faces)
// Each sign divided into three 10° sections
// Follows Chaldean order starting from Mars in Aries
const FACES: Record<ZodiacSign, [string, string, string]> = {
  aries:       ["mars", "sun", "venus"],
  taurus:      ["mercury", "moon", "saturn"],
  gemini:      ["jupiter", "mars", "sun"],
  cancer:      ["venus", "mercury", "moon"],
  leo:         ["saturn", "jupiter", "mars"],
  virgo:       ["sun", "venus", "mercury"],
  libra:       ["moon", "saturn", "jupiter"],
  scorpio:     ["mars", "sun", "venus"],
  sagittarius: ["mercury", "moon", "saturn"],
  capricorn:   ["jupiter", "mars", "sun"],
  aquarius:    ["venus", "mercury", "moon"],
  pisces:      ["saturn", "jupiter", "mars"],
};

// Dignity scoring (Lilly's point system)
const DIGNITY_SCORES = {
  domicile: +5,
  exaltation: +4,
  triplicity: +3,
  term: +2,
  face: +1,
  detriment: -5,
  fall: -4,
  peregrine: -5,   // Some systems score peregrine as -5
};

interface FullDignity {
  body: string;
  domicile: boolean;
  exaltation: boolean;
  triplicity: boolean;    // Is the triplicity ruler of the sign?
  term: boolean;          // Is the term ruler at this degree?
  face: boolean;          // Is the face ruler at this decan?
  detriment: boolean;
  fall: boolean;
  peregrine: boolean;     // No essential dignity at all
  score: number;          // Sum of applicable scores
}

function calculateFullDignities(
  positions: Record<string, ZodiacPosition>,
  isDayChart: boolean,     // Affects triplicity ruler (day vs night)
): FullDignity[]
```

### Backend Enhancement

Extend the natal API response to include full dignities:
```python
# Update NatalResponse to include:
"dignities": {
  "sun": {
    "domicile": false,
    "exaltation": false,
    "triplicity": true,
    "term": false,
    "face": false,
    "detriment": false,
    "fall": false,
    "peregrine": false,
    "score": 3
  },
  ...
}
```

Or calculate entirely client-side from the zodiac positions — no API change needed.

---

## 5. Arabic Parts / Lots

**Location:** Chart display page, collapsible panel
**Priority:** Medium — valued by traditional astrologers
**Tier:** Premium
**Backend changes:** None — calculated from existing position data

### Specification

Calculate and display Arabic Parts (Lots) from the chart data.

```
┌──────────────────────────────────────────────────────┐
│  Arabic Parts                              PREMIUM   │
│                                                       │
│  Name           Longitude      Sign       House      │
│  Fortune        13°♎11'42"    ♎ Libra      2        │
│  Spirit         06°♌26'19"    ♌ Leo       12        │
│  Exaltation     28°♌59'       ♌ Leo       12        │
│  Necessity      16°♓59'       ♓ Pisces     7        │
│  Eros           28°♊10'       ♊ Gemini    10        │
│  Courage        15°♓11'       ♓ Pisces     7        │
│  Victory        20°♌52'       ♌ Leo       12        │
│  Nemesis        15°♓09'       ♓ Pisces     7        │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Calculation

Arabic Parts are calculated using the formula: `ASC + Planet A - Planet B`

```typescript
interface ArabicPart {
  name: string;
  formula: string;           // Human-readable: "ASC + Moon - Sun"
  dayFormula: {              // Components for day chart
    base: "asc" | "mc";
    add: string;             // CelestialBody key
    subtract: string;        // CelestialBody key
  };
  nightFormula?: {           // If different at night (reverse add/subtract)
    base: "asc" | "mc";
    add: string;
    subtract: string;
  };
}

const ARABIC_PARTS: ArabicPart[] = [
  {
    name: "Fortune",
    formula: "ASC + Moon - Sun (day) / ASC + Sun - Moon (night)",
    dayFormula:   { base: "asc", add: "moon", subtract: "sun" },
    nightFormula: { base: "asc", add: "sun", subtract: "moon" },
  },
  {
    name: "Spirit",
    formula: "ASC + Sun - Moon (day) / ASC + Moon - Sun (night)",
    dayFormula:   { base: "asc", add: "sun", subtract: "moon" },
    nightFormula: { base: "asc", add: "moon", subtract: "sun" },
  },
  {
    name: "Exaltation",
    formula: "ASC + 19°Aries - Sun",
    dayFormula: { base: "asc", add: "_aries19", subtract: "sun" },
    // 19° Aries = Sun's exaltation degree = 19.0 absolute longitude
  },
  {
    name: "Necessity",
    formula: "ASC + Fortune - Mercury",
    dayFormula: { base: "asc", add: "_fortune", subtract: "mercury" },
  },
  {
    name: "Eros",
    formula: "ASC + Venus - Spirit",
    dayFormula: { base: "asc", add: "venus", subtract: "_spirit" },
  },
  {
    name: "Courage",
    formula: "ASC + Fortune - Mars",
    dayFormula: { base: "asc", add: "_fortune", subtract: "mars" },
  },
  {
    name: "Victory",
    formula: "ASC + Jupiter - Spirit",
    dayFormula: { base: "asc", add: "jupiter", subtract: "_spirit" },
  },
  {
    name: "Nemesis",
    formula: "ASC + Fortune - Saturn",
    dayFormula: { base: "asc", add: "_fortune", subtract: "saturn" },
  },
];

interface CalculatedLot {
  name: string;
  longitude: number;         // 0-360 absolute
  sign: ZodiacSign;
  degree: number;
  minute: number;
  second: number;
  house: number;             // Which house the lot falls in
}

function calculateArabicParts(
  chartData: ChartData,
  isDayChart: boolean,
): CalculatedLot[]
```

**Day/night determination:**
```typescript
function isDayChart(sunLongitude: number, ascendant: number): boolean {
  // Sun is above the horizon if it's in houses 7-12
  // (between DSC and ASC going counter-clockwise through MC)
  // Simplified: Sun is above horizon if its longitude is between
  // DSC (ASC + 180) and ASC (going counter-clockwise)
  const dsc = (ascendant + 180) % 360;
  // Normalize to check if Sun is in the upper hemisphere
  const sunRelative = (sunLongitude - dsc + 360) % 360;
  return sunRelative < 180;
}
```

---

## 6. Aspect Grid View

**Location:** Chart display page, "Aspects" tab (alternative to aspect list)
**Priority:** Low-medium — compact reference for advanced users
**Tier:** Free
**Backend changes:** None — uses existing aspect data

### Specification

Matrix showing every planet-to-planet aspect at a glance.

```
        ☉    ☽    ☿    ♀    ♂    ♃    ♄
  ☉     ·
  ☽    □ 2°   ·
  ☿    ☌ 5°  △ 1°   ·
  ♀    ⚹ 3°   —   □ 4°   ·
  ♂     —   ☍ 0°   —    —    ·
  ♃    △ 2°   —   ⚹ 1°  ☌ 3°  —    ·
  ♄     —   □ 5°   —   △ 2°  ⚹ 4°  —    ·
```

### Visual Design

- Lower triangle matrix (avoid duplicates)
- Each cell: aspect glyph (colored by type) + orb value
- Empty cells (no aspect): dash or blank
- Applying aspects: bold or underlined orb
- Separating aspects: normal weight
- Cell hover: tooltip with full details ("Sun square Moon, 2°34' applying")
- Diagonal: planet glyph header for each row/column
- Compact: fits in the right panel without scrolling for 10 planets

### Implementation

```typescript
interface AspectGridCell {
  body1: string;
  body2: string;
  aspect: Aspect | null;    // null = no aspect within orb
}

function buildAspectGrid(
  bodies: string[],
  aspects: Aspect[],
): AspectGridCell[][]
```

---

## 7. Planetary Speed Indicator

**Location:** Planet table in chart display (new column)
**Priority:** Low — mainly for horary practitioners
**Tier:** Free
**Backend changes:** None — calculated from speed data already in API response

### Specification

Add a speed column to the planet position table.

```
Planet  Sign      Degree    House  Speed    Dignity
☉ Sun   ♈ Aries   19°07'    8     → avg     —
☽ Moon  ♎ Libra   12°21'    2     → fast    —
☿ Merc  ♈ Aries   01°03'    8     ℞ retro   —
♀ Venus ♓ Pisces  27°51'    7     → slow    Exalt
♂ Mars  ♋ Cancer  14°22'    11    → fast    Fall
```

### Calculation

```typescript
type SpeedStatus = "fast" | "average" | "slow" | "stationary" | "retrograde";

function getSpeedStatus(body: string, speed: number): SpeedStatus {
  if (speed < 0) return "retrograde";

  const meanSpeed = MEAN_SPEEDS[body];
  if (!meanSpeed) return "average";

  const ratio = speed / meanSpeed;
  if (ratio < 0.1) return "stationary";  // < 10% of mean
  if (ratio < 0.7) return "slow";        // < 70% of mean
  if (ratio > 1.3) return "fast";        // > 130% of mean
  return "average";
}
```

### Visual

- Fast: green arrow →, text "fast"
- Average: gray arrow →, text "avg" or just →
- Slow: orange arrow →, text "slow"
- Stationary: warning color, text "stn"
- Retrograde: red ℞ symbol, text "retro"

---

## 8. Day/Night Chart Indicator

**Location:** Chart display page, in the metadata area near the chart header
**Priority:** Low — but needed for correct dignity and lot calculations
**Tier:** Free
**Backend changes:** None — derived from Sun position vs ASC

### Specification

Simple indicator showing whether the chart is a day or night chart (sect).

```
☉ Day Chart — Sun above horizon (8th house)
```
or
```
☽ Night Chart — Sun below horizon (4th house)
```

### Visual

- Small badge/tag near the chart title
- Day: ☉ icon + "Day Chart" in warm color (sun/gold)
- Night: ☽ icon + "Night Chart" in cool color (blue/silver)
- Tooltip: "The Sun is in the 8th house, above the Ascendant-Descendant axis"

---

## Implementation Priority Summary

### Add to Home Screen (Phase 3 enhancement or Phase 5)

| Feature | Effort | Value | Tier |
|---------|--------|-------|------|
| Lunar Phase Calendar | 1-2 days | High | Free |
| Planetary Hours | 1-2 days | High | Free |
| Enhanced Retrograde Tracker | 1 day | High | Free/Premium |

### Add to Chart Display (Phase 5)

| Feature | Effort | Value | Tier |
|---------|--------|-------|------|
| Essential Dignities Full Table | 2-3 days | Medium-High | Free/Premium |
| Arabic Parts / Lots | 1-2 days | Medium | Premium |
| Aspect Grid View | 1-2 days | Medium | Free |
| Planetary Speed Column | 0.5 day | Low-Medium | Free |
| Day/Night Indicator | 0.5 day | Low | Free |

### Dependencies

```
Lunar Phase Calendar  → needs approx-engine (Sun + Moon positions)
Planetary Hours       → needs sunrise/sunset calc (add suncalc npm package or custom)
Enhanced Retrogrades  → needs approx-engine (planetary speeds) + optional API endpoint
Essential Dignities   → needs triplicity/term/face tables (pure data, no API)
Arabic Parts          → needs day/night determination + existing chart data
Aspect Grid           → needs existing aspect data (no new calculation)
Speed Indicator       → needs existing speed data from API (already returned)
Day/Night Indicator   → needs Sun position + ASC (already in chart data)
```

### Suggested npm Addition

```bash
# For planetary hours sunrise/sunset calculation
npm install suncalc    # ~4KB, no dependencies, well-maintained
```
