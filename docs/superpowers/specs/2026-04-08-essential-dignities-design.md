# Essential Dignities on PlanetCard — Design Spec

## Overview

Add essential dignity information to the PlanetCard component on the chart-view page. The card gains a double-click expand/collapse interaction (same pattern as PlanetaryHoursCard). Compact view adds a house column. Expanded view shows a dignity summary badge per planet and a full dignity detail grid below.

Scope is limited to the 4 basic dignities: domicile, exaltation, detriment, fall. Triplicity, term, face, and Lilly scoring are deferred (logged in `future_improvements.md`).

## Interaction

- **Double-click** the PlanetCard to toggle between compact and expanded views
- Follows the same `useState(expanded)` + `onClick` pattern used by `PlanetaryHoursCard`
- Card shows `cursor-pointer` and the existing `card-hover` class

## Compact View

Same as current PlanetCard, plus a **house number column**.

```
☉  ♈  19°07'    8
☽  ♉  12°21'    2
☿  ♈  01°03' ℞  8
♀  ♓  27°51'    7
♂  ♋  14°22'   11
♃  ♋  08°44'   11
♄  ♈  01°18'    8
♅  ♊  05°12'   10
♆  ♈  03°41'    8
♇  ♒  06°15'    6
⚷  ♈  22°44'    8
☊  ♓  27°30'    7
☋  ♍  27°30'    1
```

**House calculation:** Compare each planet's ecliptic longitude (`positions[body].longitude`) against the 12 house cusps (`houses.cusps[]`). A planet belongs to the house whose cusp it has most recently passed (going counter-clockwise). This is a simple utility function.

```typescript
function getHouseForLongitude(longitude: number, cusps: number[]): number
```

## Expanded View

Two sections separated by a divider.

### Top Section — Position Table + Dignity Badge

Same columns as compact view, plus a badge column at the end showing the planet's **strongest** applicable dignity or debility for its current sign:

- **Domicile** — green badge, takes priority over exaltation
- **Exaltation** — green badge
- **Detriment** — red badge
- **Fall** — red badge
- **None (peregrine)** — muted dash, no badge

Priority order: Domicile > Exaltation > Detriment > Fall. Only one badge per planet.

Badge styling: small pill with tinted background (`bg-green-900/30 text-success` for dignities, `bg-red-900/30 text-destructive` for debilities).

### Bottom Section — Dignity Detail Grid

Below a `border-t border-border` divider, a section labeled "Dignity Detail" (uppercase, muted, `text-xs`).

Grid columns: Planet glyph | Sign glyph (the sign the planet is in) | Rul | Exalt | Detr | Fall

Each cell shows the **planet glyph that holds that dignity for the sign** the row planet occupies. When the row's planet matches the cell's planet, it is highlighted:
- **Green + bold** if the planet has that dignity (domicile or exaltation in its own sign)
- **Red + bold** if the planet has that debility (detriment or fall in that sign)
- **Muted** for all other planets (shown for reference)

### Planets Included

**Position table + dignity grid:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.

**Excluded from dignity grid:** Chiron, nodes (no traditional or modern rulership assignments).

**Excluded from position table:** unchanged — shows all bodies including Chiron and nodes as before.

## Dignity Data

### Rulership (Domicile)

Pure lookup table — which planet rules which sign(s).

Traditional + modern rulerships:

| Planet  | Rules              |
|---------|--------------------|
| Sun     | Leo                |
| Moon    | Cancer             |
| Mercury | Gemini, Virgo      |
| Venus   | Taurus, Libra      |
| Mars    | Aries, Scorpio*    |
| Jupiter | Sagittarius, Pisces* |
| Saturn  | Capricorn, Aquarius* |
| Uranus  | Aquarius           |
| Neptune | Pisces             |
| Pluto   | Scorpio            |

*Traditional rulers retained alongside modern co-rulers.

For signs with dual rulers (Scorpio, Aquarius, Pisces), both the traditional and modern ruler are considered domicile rulers.

### Exaltation

| Planet  | Exalted in    |
|---------|---------------|
| Sun     | Aries         |
| Moon    | Taurus        |
| Mercury | Virgo         |
| Venus   | Pisces        |
| Mars    | Capricorn     |
| Jupiter | Cancer        |
| Saturn  | Libra         |

Uranus, Neptune, Pluto have no traditional exaltation signs — these cells show a dash.

### Detriment

Opposite sign from domicile:

| Planet  | Detriment in       |
|---------|--------------------|
| Sun     | Aquarius           |
| Moon    | Capricorn          |
| Mercury | Sagittarius, Pisces |
| Venus   | Aries, Scorpio     |
| Mars    | Taurus, Libra      |
| Jupiter | Gemini, Virgo      |
| Saturn  | Cancer, Leo        |
| Uranus  | Leo                |
| Neptune | Virgo              |
| Pluto   | Taurus             |

### Fall

Opposite sign from exaltation:

| Planet  | Fall in       |
|---------|---------------|
| Sun     | Libra         |
| Moon    | Scorpio       |
| Mercury | Pisces        |
| Venus   | Virgo         |
| Mars    | Cancer        |
| Jupiter | Capricorn     |
| Saturn  | Aries         |

Uranus, Neptune, Pluto have no traditional fall signs — these cells show a dash.

## Data Flow

```
ChartData (positions, zodiac_positions, houses)
  │
  ├── getHouseForLongitude(longitude, cusps) → house number
  │
  └── getDignity(body, sign) → { domicile, exaltation, detriment, fall,
                                   signRuler, signExaltation, signDetriment, signFall }
```

All dignity computation is **client-side only** — pure lookup against the tables above. No backend API changes.

### New Files

- `apps/web/src/lib/dignities.ts` — dignity lookup tables and calculation functions
  - `RULERSHIPS`, `EXALTATIONS`, `DETRIMENTS`, `FALLS` constant tables
  - `getDignityForPlanet(body, sign)` — returns the planet's dignity status in that sign
  - `getDignityDetail(sign)` — returns all 4 dignity holders for a sign
  - `getHouseForLongitude(longitude, cusps)` — returns house number (1-12)
  - `getStrongestDignity(body, sign)` — returns single strongest dignity/debility or null

### Modified Files

- `apps/web/src/components/home/planet-card.tsx` — add expand/collapse state, house column, expanded view with badge + dignity grid

## Testing

- `apps/web/src/lib/dignities.test.ts` — unit tests for:
  - Each planet in its domicile sign returns domicile
  - Each planet in its exaltation sign returns exaltation
  - Detriment and fall cases
  - Peregrine case (no dignity)
  - Priority: domicile wins over exaltation when both theoretically apply
  - House calculation with various cusp configurations
  - Modern rulerships for Uranus, Neptune, Pluto
  - Edge case: planet at 0° of a sign

## Out of Scope

- Triplicity, term, face dignities (future — see `future_improvements.md`)
- Lilly scoring system (future)
- Backend API changes
- Tooltip or hover detail on dignity cells
